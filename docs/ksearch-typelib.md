# KSearch embedded type library

- Source: `E:/Code/typing-training/jsdzt2006/KSearch.dll`
- Name: `KSEARCHLib`
- GUID: `{5927ad35-317b-4e31-8616-e5a9b2ae37ba}`
- Version: `1.0`
- Description: KSearch 1.0 Type Library

## TKIND_COCLASS: `Engine`

- GUID: `{925b6ebe-667b-489d-a987-b10e9299f305}`
- Description: Engine Class

Implements:
- `IEngine`

## TKIND_DISPATCH: `IEngine`

- GUID: `{53543884-0ac0-4d60-be53-bc1dc0a3e2c3}`
- Description: IEngine Interface

```text
[INVOKE_FUNC, memid=1610612736, vtable=0] void QueryInterface([in] GUID* riid, [out] void** ppvObj);
[INVOKE_FUNC, memid=1610612737, vtable=8] uint32 AddRef();
[INVOKE_FUNC, memid=1610612738, vtable=16] uint32 Release();
[INVOKE_FUNC, memid=1610678272, vtable=24] void GetTypeInfoCount([out] VT_UINT* pctinfo);
[INVOKE_FUNC, memid=1610678273, vtable=32] void GetTypeInfo([in] VT_UINT itinfo, [in] uint32 lcid, [out] void** pptinfo);
[INVOKE_FUNC, memid=1610678274, vtable=40] void GetIDsOfNames([in] GUID* riid, [in] VT_I1** rgszNames, [in] VT_UINT cNames, [in] uint32 lcid, [out] int32* rgdispid);
[INVOKE_FUNC, memid=1610678275, vtable=48] void Invoke([in] int32 dispidMember, [in] GUID* riid, [in] uint32 lcid, [in] uint16 wFlags, [in] DISPPARAMS* pdispparams, [out] VARIANT* pvarResult, [out] EXCEPINFO* pexcepinfo, [out] VT_UINT* puArgErr);
[INVOKE_FUNC, memid=1, vtable=56] void Open([in] BSTR bstrPathName);
[INVOKE_FUNC, memid=2, vtable=64] void Close();
[INVOKE_FUNC, memid=3, vtable=72] int32 GetIndexByStr([in] BSTR bstrSearchStr, [in, out] int32* pnIndex);
[INVOKE_FUNC, memid=4, vtable=80] int32 GetCloseIdxByIndex([in] int32 nIndex, [in] int32 nDirection, [in] int32 nNumber, [in, out] int32[]* pnIndexArray);
[INVOKE_FUNC, memid=5, vtable=88] BSTR GetEntryByIndex([in] int32 nIndex);
[INVOKE_FUNC, memid=6, vtable=96] BSTR GetExplainByIndex([in] int32 nIndex);
[INVOKE_FUNC, memid=7, vtable=104] int32 GetFuzzyIdxByStr([in] BSTR bstrSearchStr, [in] int32 nLastIndex, [in] int32 nNumber, [in, out] int32[]* pnIndexArray);
[INVOKE_FUNC, memid=8, vtable=112] int32 GetWildcardIdxByStr([in] BSTR bstrSearchStr, [in] int32 nLastIndex, [in] int32 nNumber, [in, out] int32[]* pnIndexArray);
```

