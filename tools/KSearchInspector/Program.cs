using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

if (args.Length is < 1 or > 2)
{
    Console.Error.WriteLine("Usage: KSearchInspector <KSearch.dll> [output.md]");
    return 2;
}

var dllPath = Path.GetFullPath(args[0]);
if (!File.Exists(dllPath))
{
    Console.Error.WriteLine($"File not found: {dllPath}");
    return 2;
}

NativeMethods.LoadTypeLibEx(dllPath, RegKind.None, out var typeLibrary);
var report = TypeLibraryReporter.Create(typeLibrary, dllPath);

if (args.Length == 2)
{
    var outputPath = Path.GetFullPath(args[1]);
    Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
    File.WriteAllText(outputPath, report, new UTF8Encoding(false));
    Console.WriteLine($"Type library report written to {outputPath}");
}
else
{
    Console.Write(report);
}

return 0;

internal enum RegKind
{
    Default = 0,
    Register = 1,
    None = 2,
}

internal static class NativeMethods
{
    [DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    internal static extern void LoadTypeLibEx(
        string fileName,
        RegKind regKind,
        [MarshalAs(UnmanagedType.Interface)] out ITypeLib typeLibrary
    );
}

internal static class TypeLibraryReporter
{
    private const int MemberIdNil = -1;

    public static string Create(ITypeLib library, string sourcePath)
    {
        var output = new StringBuilder();
        library.GetDocumentation(-1, out var libraryName, out var libraryDoc, out _, out _);
        library.GetLibAttr(out var libraryAttributePointer);

        try
        {
            var attribute = Marshal.PtrToStructure<TYPELIBATTR>(libraryAttributePointer);
            output.AppendLine("# KSearch embedded type library");
            output.AppendLine();
            output.AppendLine($"- Source: `{sourcePath.Replace('\\', '/')}`");
            output.AppendLine($"- Name: `{libraryName}`");
            output.AppendLine($"- GUID: `{attribute.guid:B}`");
            output.AppendLine($"- Version: `{attribute.wMajorVerNum}.{attribute.wMinorVerNum}`");
            if (!string.IsNullOrWhiteSpace(libraryDoc)) output.AppendLine($"- Description: {libraryDoc}");
            output.AppendLine();
        }
        finally
        {
            library.ReleaseTLibAttr(libraryAttributePointer);
        }

        var typeCount = library.GetTypeInfoCount();
        for (var typeIndex = 0; typeIndex < typeCount; typeIndex++)
        {
            library.GetTypeInfo(typeIndex, out var typeInfo);
            typeInfo.GetDocumentation(MemberIdNil, out var typeName, out var typeDoc, out _, out _);
            typeInfo.GetTypeAttr(out var typeAttributePointer);

            try
            {
                var attribute = Marshal.PtrToStructure<TYPEATTR>(typeAttributePointer);
                output.AppendLine($"## {attribute.typekind}: `{typeName}`");
                output.AppendLine();
                output.AppendLine($"- GUID: `{attribute.guid:B}`");
                if (!string.IsNullOrWhiteSpace(typeDoc)) output.AppendLine($"- Description: {typeDoc}");
                output.AppendLine();

                if (attribute.typekind == TYPEKIND.TKIND_COCLASS)
                {
                    AppendImplementedTypes(output, typeInfo, attribute);
                }

                if (attribute.cFuncs > 0)
                {
                    output.AppendLine("```text");
                    for (var functionIndex = 0; functionIndex < attribute.cFuncs; functionIndex++)
                    {
                        typeInfo.GetFuncDesc(functionIndex, out var functionPointer);
                        try
                        {
                            var function = Marshal.PtrToStructure<FUNCDESC>(functionPointer);
                            output.AppendLine(FormatFunction(typeInfo, function));
                        }
                        finally
                        {
                            typeInfo.ReleaseFuncDesc(functionPointer);
                        }
                    }
                    output.AppendLine("```");
                    output.AppendLine();
                }
            }
            finally
            {
                typeInfo.ReleaseTypeAttr(typeAttributePointer);
                Marshal.FinalReleaseComObject(typeInfo);
            }
        }

        return output.ToString();
    }

    private static void AppendImplementedTypes(StringBuilder output, ITypeInfo typeInfo, TYPEATTR attribute)
    {
        if (attribute.cImplTypes == 0) return;

        output.AppendLine("Implements:");
        for (var index = 0; index < attribute.cImplTypes; index++)
        {
            typeInfo.GetRefTypeOfImplType(index, out var referenceHandle);
            typeInfo.GetRefTypeInfo(referenceHandle, out var referenceInfo);
            try
            {
                referenceInfo.GetDocumentation(MemberIdNil, out var name, out _, out _, out _);
                output.AppendLine($"- `{name}`");
            }
            finally
            {
                Marshal.FinalReleaseComObject(referenceInfo);
            }
        }
        output.AppendLine();
    }

    private static string FormatFunction(ITypeInfo typeInfo, FUNCDESC function)
    {
        var names = new string[Math.Max(1, function.cParams + 1)];
        typeInfo.GetNames(function.memid, names, names.Length, out var nameCount);
        var methodName = nameCount > 0 ? names[0] : $"memid_{function.memid}";
        var parameters = new List<string>();
        var parameterSize = Marshal.SizeOf<ELEMDESC>();

        for (var index = 0; index < function.cParams; index++)
        {
            var elementPointer = IntPtr.Add(function.lprgelemdescParam, index * parameterSize);
            var element = Marshal.PtrToStructure<ELEMDESC>(elementPointer);
            var parameterName = index + 1 < nameCount ? names[index + 1] : $"arg{index + 1}";
            var flags = (PARAMFLAG)element.desc.paramdesc.wParamFlags;
            var direction = FormatParameterFlags(flags);
            parameters.Add($"{direction}{FormatType(typeInfo, element.tdesc)} {parameterName}");
        }

        var returnType = FormatType(typeInfo, function.elemdescFunc.tdesc);
        return $"[{function.invkind}, memid={function.memid}, vtable={function.oVft}] {returnType} {methodName}({string.Join(", ", parameters)});";
    }

    private static string FormatParameterFlags(PARAMFLAG flags)
    {
        var values = new List<string>();
        if (flags.HasFlag(PARAMFLAG.PARAMFLAG_FIN)) values.Add("in");
        if (flags.HasFlag(PARAMFLAG.PARAMFLAG_FOUT)) values.Add("out");
        if (flags.HasFlag(PARAMFLAG.PARAMFLAG_FRETVAL)) values.Add("retval");
        return values.Count == 0 ? string.Empty : $"[{string.Join(", ", values)}] ";
    }

    private static string FormatType(ITypeInfo owner, TYPEDESC descriptor)
    {
        var variantType = (VarEnum)descriptor.vt;
        if (variantType is VarEnum.VT_PTR or VarEnum.VT_SAFEARRAY)
        {
            var nested = Marshal.PtrToStructure<TYPEDESC>(descriptor.lpValue);
            var suffix = variantType == VarEnum.VT_PTR ? "*" : "[]";
            return $"{FormatType(owner, nested)}{suffix}";
        }

        if (variantType == VarEnum.VT_USERDEFINED)
        {
            var referenceHandle = unchecked((int)descriptor.lpValue.ToInt64());
            owner.GetRefTypeInfo(referenceHandle, out var referenceInfo);
            try
            {
                referenceInfo.GetDocumentation(MemberIdNil, out var name, out _, out _, out _);
                return name;
            }
            finally
            {
                Marshal.FinalReleaseComObject(referenceInfo);
            }
        }

        return variantType switch
        {
            VarEnum.VT_EMPTY => "void",
            VarEnum.VT_VOID => "void",
            VarEnum.VT_HRESULT => "HRESULT",
            VarEnum.VT_BSTR => "BSTR",
            VarEnum.VT_I2 => "int16",
            VarEnum.VT_I4 => "int32",
            VarEnum.VT_UI2 => "uint16",
            VarEnum.VT_UI4 => "uint32",
            VarEnum.VT_BOOL => "VARIANT_BOOL",
            VarEnum.VT_VARIANT => "VARIANT",
            VarEnum.VT_DISPATCH => "IDispatch*",
            VarEnum.VT_UNKNOWN => "IUnknown*",
            _ => variantType.ToString(),
        };
    }
}
