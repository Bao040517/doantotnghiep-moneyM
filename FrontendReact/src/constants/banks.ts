export interface BankInfo {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export const VIETQR_BANKS: BankInfo[] = [
  { bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", logo: "https://api.vietqr.io/img/VCB.png" },
  { bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công Thương Việt Nam", logo: "https://api.vietqr.io/img/CTG.png" },
  { bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", logo: "https://api.vietqr.io/img/VBA.png" },
  { bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", logo: "https://api.vietqr.io/img/BIDV.png" },
  { bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", logo: "https://api.vietqr.io/img/TCB.png" },
  { bin: "970422", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội", logo: "https://api.vietqr.io/img/MB.png" },
  { bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", logo: "https://api.vietqr.io/img/VPB.png" },
  { bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", logo: "https://api.vietqr.io/img/TPB.png" },
  { bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc Tế Việt Nam", logo: "https://api.vietqr.io/img/VIB.png" },
  { bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP. Hồ Chí Minh", logo: "https://api.vietqr.io/img/HDB.png" },
];
