// ================= takeScreenshot @ 0x00479540 =================

/* WARNING: Enum "_Fmtflags": Some values do not have unique names */
/* decompilerscript: committed: 2025-01-30 21:57:43.216000 */

void __thiscall
_HoldStrong::UI::Rendering::WindowAndDirectDraw::takeScreenshot
          (WindowAndDirectDraw *this,int param_1)

{
  char cVar1;
  ushort uVar2;
  int iVar3;
  uint uVar4;
  StringObject *pSVar5;
  CharPointerArrayUnion *pCVar6;
  uint uVar7;
  LowLevelMemory *this_00;
  char *pcVar8;
  char *pcVar9;
  ushort *puVar10;
  int iVar11;
  int _heightIndex;
  dword *_ios_base_child_PtrUnk;
  undefined1 *local_8c4;
  uint local_8c0;
  BITMAPFILEHEADER _ptrBmpFileHeader;
  basic_ofstream<char,_struct_std::char_traits<char>_> _ofstream;
  BITMAPINFOHEADER _ptrBitmapInfoHeader;
  StringObject local_7fc;
  char local_7e0 [18];
  char local_7ce [982];
  char local_3f8 [1000];
  uint local_10;
  void *local_c;
  code *pcStack_8;
  int local_4;
  
  local_4 = -1;
  pcStack_8 = HoldStrong_lib::EH_FUN_00599fb4;
  local_c = ExceptionList;
  local_10 = MSVC_SecurityCookie ^ (uint)&_heightIndex;
  uVar4 = MSVC_SecurityCookie ^ (uint)&stack0xfffff724;
  ExceptionList = &local_c;
  pSVar5 = IO::ResourceManager::getDocumentsFolderString(&DAT_ResourceManager,&local_7fc,'\x01');
  if (pSVar5->dataLength < 0x10) {
    pCVar6 = &pSVar5->data;
  }
  else {
    pCVar6 = (CharPointerArrayUnion *)(pSVar5->data).pCharArray;
  }
  pcVar8 = local_7e0;
  do {
    cVar1 = pCVar6->charArray[0];
    *pcVar8 = cVar1;
    pCVar6 = (CharPointerArrayUnion *)((int)pCVar6 + 1);
    pcVar8 = pcVar8 + 1;
  } while (cVar1 != '\0');
  if (0xf < local_7fc.dataLength) {
    OS::_free(local_7fc.data.pCharArray);
  }
  if (param_1 == -1) {
    pcVar8 = (char *)((int)&local_7fc.dataLength + 3);
    do {
      pcVar9 = pcVar8;
      pcVar8 = pcVar9 + 1;
    } while (pcVar9[1] != '\0');
    *(undefined4 *)(pcVar9 + 1) = s_screen_capture_bmp_005a6538._0_4_;
    *(undefined4 *)(pcVar9 + 5) = s_screen_capture_bmp_005a6538._4_4_;
    *(undefined4 *)(pcVar9 + 9) = s_screen_capture_bmp_005a6538._8_4_;
    *(undefined4 *)(pcVar9 + 0xd) = s_screen_capture_bmp_005a6538._12_4_;
    *(undefined2 *)(pcVar9 + 0x11) = s_screen_capture_bmp_005a6538._16_2_;
    pcVar9[0x13] = s_screen_capture_bmp_005a6538[0x12];
  }
  else {
    OS::_sprintf(local_3f8,"screen_capture_%03d.bmp",param_1,uVar4);
    pcVar8 = local_3f8;
    do {
      cVar1 = *pcVar8;
      pcVar8 = pcVar8 + 1;
    } while (cVar1 != '\0');
    uVar4 = (int)pcVar8 - (int)local_3f8;
    pcVar8 = (char *)((int)&local_7fc.dataLength + 3);
    do {
      pcVar9 = pcVar8 + 1;
      pcVar8 = pcVar8 + 1;
    } while (*pcVar9 != '\0');
    pcVar9 = local_3f8;
    for (uVar7 = uVar4 >> 2; uVar7 != 0; uVar7 = uVar7 - 1) {
      *(undefined4 *)pcVar8 = *(undefined4 *)pcVar9;
      pcVar9 = pcVar9 + 4;
      pcVar8 = pcVar8 + 4;
    }
    for (uVar4 = uVar4 & 3; uVar4 != 0; uVar4 = uVar4 - 1) {
      *pcVar8 = *pcVar9;
      pcVar9 = pcVar9 + 1;
      pcVar8 = pcVar8 + 1;
    }
  }
  HoldStrong_lib::std::basic_ofstream<char,_struct_std::char_traits<char>_>::
  basic_ofstream<char,_struct_std::char_traits<char>_>
            ((char_traits<char>_> *)&_ofstream,local_7e0,0x20,0x40,1);
  local_4 = 0;
  if (((&_ofstream.field_0x8)
       [(int)_ofstream.vftptr_0x0[1].~basic_ofstream<char,_struct_std::char_traits<char>_>_0] & 6)
      == 0) {
    bltMapGameSurfaceToScreenMenuSurfaceComplete(&DAT_WindowAndDirectDraw);
    IO::LowLevelMemory::fillMemory_ByteValue(&DAT_LowLevelMemory,0xe,'\0',&_ptrBmpFileHeader);
    IO::LowLevelMemory::copyData(this_00,2,"BM",&_ptrBmpFileHeader);
    _ptrBmpFileHeader.bfSize = DAT_WindowAndDirectDraw.numPixel_GameX_x_3_x_GameY_0x4c + 0x36;
    _ptrBmpFileHeader.bfOffBits = 0x36;
    uVar4 = 0;
    do {
      OS::basic_ofstream_write(&_ofstream,(uint)*(byte *)((int)&_ptrBmpFileHeader.bfType + uVar4));
      uVar4 = uVar4 + 1;
    } while (uVar4 < 0xe);
    IO::LowLevelMemory::fillMemory_ByteValue(&DAT_LowLevelMemory,0x28,'\0',&_ptrBitmapInfoHeader);
    _ptrBitmapInfoHeader.biSize = 0x28;
    _ptrBitmapInfoHeader.biPlanes = 1;
    _ptrBitmapInfoHeader.biBitCount = 24;
    _ptrBitmapInfoHeader.biWidth = DAT_WindowAndDirectDraw.resolutionX;
    _ptrBitmapInfoHeader.biHeight = DAT_WindowAndDirectDraw.resolutionY;
    _ptrBitmapInfoHeader.biCompression = 0;
    _ptrBitmapInfoHeader.biSizeImage = DAT_WindowAndDirectDraw.numPixel_GameX_x_3_x_GameY_0x4c;
    uVar4 = 0;
    do {
      OS::basic_ofstream_write
                (&_ofstream,(uint)*(byte *)((int)&_ptrBitmapInfoHeader.biSize + uVar4));
      uVar4 = uVar4 + 1;
      iVar3 = DAT_WindowAndDirectDraw.resolutionX;
      _heightIndex = DAT_WindowAndDirectDraw.resolutionY;
    } while (uVar4 < 0x28);
    while (_heightIndex = _heightIndex + -1, -1 < _heightIndex) {
      iVar11 = 0;
      puVar10 = DAT_WindowAndDirectDraw.surfacePointer_screenMenu + iVar3 * _heightIndex;
      if (0 < iVar3) {
        do {
          uVar2 = *puVar10;
          local_8c0 = CONCAT31(local_8c0._1_3_,(char)uVar2 << 3);
          puVar10 = puVar10 + 1;
          OS::basic_ofstream_write(&_ofstream,local_8c0);
          local_8c4 = (undefined1 *)CONCAT31(local_8c4._1_3_,(char)((int)(uint)uVar2 >> 5) * '\x04')
          ;
          OS::basic_ofstream_write(&_ofstream,(uint)local_8c4);
          _ios_base_child_PtrUnk =
               (dword *)CONCAT31(_ios_base_child_PtrUnk._1_3_,(char)((short)uVar2 >> 0xb) << 3);
          OS::basic_ofstream_write(&_ofstream,(uint)_ios_base_child_PtrUnk);
          iVar11 = iVar11 + 1;
          iVar3 = DAT_WindowAndDirectDraw.resolutionX;
        } while (iVar11 < DAT_WindowAndDirectDraw.resolutionX);
      }
    }
    _ios_base_child_PtrUnk = &_ofstream.mbr_0x54;
    *(undefined ***)
     (_ofstream.vftptr_0x0[1].~basic_ofstream<char,_struct_std::char_traits<char>_>_0 +
     (int)&_ofstream.vftptr_0x0) = std::basic_ofstream<char,struct_std::char_traits<char>_>::vftable
    ;
    local_8c4 = &_ofstream.field_0x4;
    _ofstream._4_4_ = std::basic_filebuf<char,struct_std::char_traits<char>_>::vftable;
    local_4 = 2;
    if (_ofstream._76_1_ != '\0') {
      if (_ofstream._80_4_ != 0) {
        HoldStrong_lib::stdLib::ios::basic_streambuf<char,_struct_std::char_traits<char>_>::
        meth_0x476680((char_traits<char>_> *)local_8c4);
        OS::_fclose((FILE *)_ofstream._80_4_);
      }
      _ofstream._20_4_ = &_ofstream.field_0xc;
      _ofstream._24_4_ = &_ofstream.field_0x10;
      _ofstream._36_4_ = &_ofstream.field_0x1c;
      _ofstream._40_4_ = &_ofstream.field_0x20;
      _ofstream._52_4_ = &_ofstream.field_0x2c;
      _ofstream._56_4_ = &_ofstream.field_0x30;
      _ofstream._76_1_ = 0;
      _ofstream._69_1_ = 0;
      _ofstream._16_4_ = 0;
      _ofstream._32_4_ = 0;
      _ofstream._48_4_ = 0;
      _ofstream._12_4_ = 0;
      _ofstream._28_4_ = 0;
      _ofstream._44_4_ = 0;
      _ofstream._80_4_ = 0;
      _ofstream._72_4_ = LIB_00df37e0;
      _ofstream._64_4_ = 0;
    }
    local_4 = CONCAT31(local_4._1_3_,1);
    HoldStrong_lib::stdLib::ios::basic_streambuf<char,_struct_std::char_traits<char>_>::
    meth_0x472680((char_traits<char>_> *)&_ofstream.field_0x4);
    local_4 = -1;
    *(undefined ***)
     (_ofstream.vftptr_0x0[1].~basic_ofstream<char,_struct_std::char_traits<char>_>_0 +
     (int)&_ofstream.vftptr_0x0) = std::basic_ostream<char,struct_std::char_traits<char>_>::vftable;
  }
  else {
    local_4 = -1;
    HoldStrong_lib::std::basic_ofstream<char,_struct_std::char_traits<char>_>::meth_0x478920
              ((char_traits<char>_> *)&_ofstream.mbr_0x54);
  }
  _ofstream.mbr_0x54 = (dword)std::ios_base::vftable;
  HoldStrong_lib::stdLib::ios::ios_base::_Ios_base_dtor((ios_base *)&_ofstream.mbr_0x54);
  ExceptionList = local_c;
  HoldStrong_lib::__security_check_cookie(local_10 ^ (uint)&_heightIndex);
  return;
}



