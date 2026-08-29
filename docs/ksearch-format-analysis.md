# KSearch dictionary format analysis

## Result

`KSearch.dll` can be used without COM registration. A 32-bit probe can load the DLL,
obtain its class factory through `DllGetClassObject`, create `IEngine`, and read the
paired `.DAT` and `.ID` files.

The embedded type library is extracted in [ksearch-typelib.md](./ksearch-typelib.md).
Its relevant calls are:

```text
void Open(BSTR datPath)
int32 GetIndexByStr(BSTR search, int32* index)
BSTR GetEntryByIndex(int32 index)
BSTR GetExplainByIndex(int32 index)
```

`Open` must receive the full `.DAT` path. The DLL locates the matching `.ID` file by
changing the extension itself.

## `.ID` structure

The file starts with the DAT index of the first entry:

```text
uint32 firstIndex
```

It is followed by variable-length records in display/training order:

```text
uint16 wordByteLength
byte[wordByteLength] word             // ASCII in the inspected English dictionaries
uint32 metadata                       // meaning not yet proven
uint32 nextIndex                      // DAT index of the next word
```

The final record may omit `nextIndex`. Some files contain zero padding after the
last record. A `nextIndex` value of zero is valid and must not be treated as EOF.

The `metadata` value correlates with word length in the inspected common-word list,
but its exact semantic meaning is not yet proven, so the extractor deliberately
keeps the neutral name `Metadata`.

For `常用单词1000.ID`, the first bytes are:

```text
B0 37 00 00                         firstIndex = 14256
03 00 74 68 65 01 00 00 00 8E 02 00 00
      "the"     metadata=1 nextIndex=654
03 00 61 6E 64 01 00 00 00 E0 25 00 00
      "and"     metadata=1 nextIndex=9696
```

The probe confirms:

```text
GetEntryByIndex(14256) = "the"
GetEntryByIndex(654)   = "and"
GetEntryByIndex(9696)  = "of"
```

This verifies that `.ID` contains an ordered linked list of indexes into the DAT
dictionary structure.

## `.DAT` structure

The files begin with:

```text
1A 57 44 49 43
   W  D  I  C
```

The remainder is a custom indexed/compressed binary format. Reimplementing the DAT
decoder is not required for migration: `KSearch.dll` already returns decoded BSTR
values through `GetEntryByIndex` and `GetExplainByIndex`.

Raw explanations contain lightweight formatting markers. For example:

```text
& [kEm5pju:tE]
\ n.计算机
```

Observed convention:

- `&` prefixes the phonetic/pronunciation line.
- `\` prefixes a definition line.
- `常用单词1000.DAT` returns `&1` for its entries and does not contain useful Chinese
  definitions.

## Extracted samples

- `ksearch-dictionaries/raw/general/常用单词1000.raw.json`: 999 entries, no read errors.
- `ksearch-dictionaries/raw/dictionary/Middle.raw.json`: 1711 entries with phonetics and Chinese explanations,
  no read errors.
- `ksearch-dictionaries/manifest.json`: validation summary for all 20 dictionaries and
  42,651 entries. The complete export has no DLL read errors.

Case-only differences exist between a few `.ID` words and canonical DAT entries,
for example `May` / `may`; they should be preserved as separate raw fields until
the training-content normalization rules are decided.

## Reproducing the extraction

Build the 32-bit probe:

```powershell
& tools\KSearchProbe\build.ps1
```

Inspect individual words:

```powershell
& tools\KSearchProbe\bin\KSearchProbe.exe `
  ..\jsdzt2006\KSearch.dll `
  ..\jsdzt2006\Data\English\T_Word\Dictionary\Middle.DAT `
  what student computer
```

Export a complete dictionary:

```powershell
& tools\KSearchProbe\bin\KSearchProbe.exe `
  ..\jsdzt2006\KSearch.dll `
  ..\jsdzt2006\Data\English\T_Word\Dictionary\Middle.DAT `
  --all docs\ksearch-dictionaries\raw\dictionary\Middle.raw.json
```

Export every English word dictionary and regenerate the manifest:

```powershell
& tools\KSearchProbe\export-all.ps1
```

The probe is explicitly compiled for x86 and loads the class factory directly, so
it neither requires nor modifies COM registration.
