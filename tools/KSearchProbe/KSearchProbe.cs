using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;

internal static class Program
{
    private static int Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);

        if (args.Length < 2)
        {
            Console.Error.WriteLine(
                "Usage: KSearchProbe.exe <KSearch.dll> <dictionary-base-path> [search-word ...]"
            );
            return 2;
        }

        if (Environment.Is64BitProcess)
        {
            Console.Error.WriteLine("This probe must run as a 32-bit process.");
            return 2;
        }

        string dllPath = Path.GetFullPath(args[0]);
        string dictionaryPath = Path.GetFullPath(args[1]);
        bool dumpAll = args.Length > 2 && args[2] == "--all";
        string outputPath = dumpAll && args.Length > 3 ? Path.GetFullPath(args[3]) : null;
        string[] searchWords = args.Length > 2 && !dumpAll
            ? Slice(args, 2)
            : new[] { "the", "and", "computer" };
        List<ProbeResult> results = new List<ProbeResult>();
        string topLevelError = null;

        int initializeResult = NativeMethods.CoInitializeEx(IntPtr.Zero, 2);
        IntPtr libraryHandle = NativeMethods.LoadLibrary(dllPath);
        if (libraryHandle == IntPtr.Zero)
        {
            Console.Error.WriteLine(
                "LoadLibrary failed with Win32 error " + Marshal.GetLastWin32Error()
            );
            return 1;
        }

        try
        {
            IntPtr export = NativeMethods.GetProcAddress(libraryHandle, "DllGetClassObject");
            if (export == IntPtr.Zero)
            {
                throw new InvalidOperationException("DllGetClassObject export not found.");
            }

            DllGetClassObject getClassObject =
                (DllGetClassObject)Marshal.GetDelegateForFunctionPointer(
                    export,
                    typeof(DllGetClassObject)
                );
            Guid classId = new Guid("925b6ebe-667b-489d-a987-b10e9299f305");
            Guid classFactoryId = new Guid("00000001-0000-0000-C000-000000000046");
            IntPtr factoryPointer;
            Marshal.ThrowExceptionForHR(
                getClassObject(ref classId, ref classFactoryId, out factoryPointer)
            );

            IClassFactory factory = null;
            IEngine engine = null;
            try
            {
                factory = (IClassFactory)Marshal.GetObjectForIUnknown(factoryPointer);
                Marshal.Release(factoryPointer);

                Guid engineId = new Guid("53543884-0ac0-4d60-be53-bc1dc0a3e2c3");
                IntPtr enginePointer;
                Marshal.ThrowExceptionForHR(
                    factory.CreateInstance(IntPtr.Zero, ref engineId, out enginePointer)
                );

                try
                {
                    engine = (IEngine)Marshal.GetObjectForIUnknown(enginePointer);
                }
                finally
                {
                    Marshal.Release(enginePointer);
                }

                engine.Open(dictionaryPath);

                if (dumpAll)
                {
                    foreach (IndexRecord record in ReadIndex(Path.ChangeExtension(dictionaryPath, ".ID")))
                    {
                        results.Add(ReadEntry(engine, record.Word, record.Index, record));
                    }
                }
                else
                {
                    foreach (string word in searchWords)
                    {
                        int index = -1;
                        int searchResult = engine.GetIndexByStr(word, ref index);
                        ProbeResult result = ReadEntry(engine, word, index, null);
                        result.SearchResult = searchResult;
                        results.Add(result);
                    }
                }

                engine.Close();
            }
            finally
            {
                if (engine != null) Marshal.FinalReleaseComObject(engine);
                if (factory != null) Marshal.FinalReleaseComObject(factory);
            }
        }
        catch (Exception exception)
        {
            topLevelError = FormatException(exception);
        }
        finally
        {
            NativeMethods.FreeLibrary(libraryHandle);
            if (initializeResult >= 0) NativeMethods.CoUninitialize();
        }

        ProbeOutput output = new ProbeOutput
        {
            DllPath = dllPath,
            DictionaryPath = dictionaryPath,
            ProcessArchitecture = Environment.Is64BitProcess ? "x64" : "x86",
            Error = topLevelError,
            Results = results,
        };
        JavaScriptSerializer serializer = new JavaScriptSerializer
        {
            MaxJsonLength = int.MaxValue,
        };
        string json = serializer.Serialize(output);
        if (outputPath == null)
        {
            Console.WriteLine(json);
        }
        else
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            File.WriteAllText(outputPath, json, new UTF8Encoding(false));
            Console.WriteLine(outputPath);
        }
        return topLevelError == null ? 0 : 1;
    }

    private static ProbeResult ReadEntry(
        IEngine engine,
        string searchWord,
        int index,
        IndexRecord record
    )
    {
        ProbeResult result = new ProbeResult
        {
            SearchWord = searchWord,
            SearchResult = 0,
            Index = index,
            Metadata = record == null ? (int?)null : record.Metadata,
            NextIndex = record == null ? (int?)null : record.NextIndex,
        };

        if (index < 0) return result;

        try
        {
            result.Entry = engine.GetEntryByIndex(index);
            result.Explanation = engine.GetExplainByIndex(index);
        }
        catch (Exception exception)
        {
            result.Error = FormatException(exception);
        }

        return result;
    }

    private static IEnumerable<IndexRecord> ReadIndex(string indexPath)
    {
        using (FileStream stream = File.OpenRead(indexPath))
        using (BinaryReader reader = new BinaryReader(stream, Encoding.ASCII))
        {
            int currentIndex = reader.ReadInt32();

            while (stream.Position + 2 <= stream.Length)
            {
                ushort wordLength = reader.ReadUInt16();
                if (wordLength == 0) yield break;
                if (stream.Position + wordLength + 4 > stream.Length)
                {
                    throw new InvalidDataException("Truncated ID record at " + (stream.Position - 2));
                }

                string word = Encoding.ASCII.GetString(reader.ReadBytes(wordLength));
                int metadata = reader.ReadInt32();
                int nextIndex = stream.Position + 4 <= stream.Length ? reader.ReadInt32() : 0;

                yield return new IndexRecord
                {
                    Index = currentIndex,
                    Word = word,
                    Metadata = metadata,
                    NextIndex = nextIndex,
                };

                currentIndex = nextIndex;
            }
        }
    }

    private static string[] Slice(string[] source, int start)
    {
        string[] result = new string[source.Length - start];
        Array.Copy(source, start, result, 0, result.Length);
        return result;
    }

    private static string FormatException(Exception exception)
    {
        return string.Format("0x{0:X8}: {1}", exception.HResult, exception.Message);
    }
}

[UnmanagedFunctionPointer(CallingConvention.StdCall)]
internal delegate int DllGetClassObject(ref Guid classId, ref Guid interfaceId, out IntPtr value);

[ComImport]
[Guid("00000001-0000-0000-C000-000000000046")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IClassFactory
{
    [PreserveSig]
    int CreateInstance(IntPtr outer, ref Guid interfaceId, out IntPtr instance);

    [PreserveSig]
    int LockServer([MarshalAs(UnmanagedType.Bool)] bool lockServer);
}

[ComImport]
[Guid("53543884-0ac0-4d60-be53-bc1dc0a3e2c3")]
[InterfaceType(ComInterfaceType.InterfaceIsDual)]
internal interface IEngine
{
    [DispId(1)]
    void Open([MarshalAs(UnmanagedType.BStr)] string pathName);

    [DispId(2)]
    void Close();

    [DispId(3)]
    int GetIndexByStr([MarshalAs(UnmanagedType.BStr)] string searchString, ref int index);

    [DispId(4)]
    int GetCloseIdxByIndex(
        int index,
        int direction,
        int number,
        [In, Out, MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_I4)] ref Array indices
    );

    [DispId(5)]
    [return: MarshalAs(UnmanagedType.BStr)]
    string GetEntryByIndex(int index);

    [DispId(6)]
    [return: MarshalAs(UnmanagedType.BStr)]
    string GetExplainByIndex(int index);
}

internal static class NativeMethods
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    internal static extern IntPtr LoadLibrary(string fileName);

    [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
    internal static extern IntPtr GetProcAddress(IntPtr module, string procedureName);

    [DllImport("kernel32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool FreeLibrary(IntPtr module);

    [DllImport("ole32.dll")]
    internal static extern int CoInitializeEx(IntPtr reserved, uint concurrencyModel);

    [DllImport("ole32.dll")]
    internal static extern void CoUninitialize();
}

internal sealed class ProbeOutput
{
    public string DllPath { get; set; }
    public string DictionaryPath { get; set; }
    public string ProcessArchitecture { get; set; }
    public string Error { get; set; }
    public List<ProbeResult> Results { get; set; }
}

internal sealed class ProbeResult
{
    public string SearchWord { get; set; }
    public int SearchResult { get; set; }
    public int Index { get; set; }
    public int? Metadata { get; set; }
    public int? NextIndex { get; set; }
    public string Entry { get; set; }
    public string Explanation { get; set; }
    public string Error { get; set; }
}

internal sealed class IndexRecord
{
    public int Index { get; set; }
    public string Word { get; set; }
    public int Metadata { get; set; }
    public int NextIndex { get; set; }
}
