export interface BankInfo {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export const VIETQR_BANKS: BankInfo[] = [
  { bin: "970422", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội", logo: "https://api.vietqr.io/img/MB.png" },
  { bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", logo: "https://api.vietqr.io/img/VCB.png" },
  { bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", logo: "https://api.vietqr.io/img/TCB.png" },
  { bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công Thương Việt Nam", logo: "https://api.vietqr.io/img/CTG.png" },
  { bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", logo: "https://api.vietqr.io/img/BIDV.png" },
  { bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", logo: "https://api.vietqr.io/img/VPB.png" },
  { bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", logo: "https://api.vietqr.io/img/TPB.png" },
  { bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu", logo: "https://api.vietqr.io/img/ACB.png" },
  { bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", logo: "https://api.vietqr.io/img/STB.png" },
  { bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", logo: "https://api.vietqr.io/img/VBA.png" },
  { bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc Tế Việt Nam", logo: "https://api.vietqr.io/img/VIB.png" },
  { bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP. Hồ Chí Minh", logo: "https://api.vietqr.io/img/HDB.png" },
  { bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", logo: "https://api.vietqr.io/img/SHB.png" },
  { bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", logo: "https://api.vietqr.io/img/MSB.png" },
  { bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông", logo: "https://api.vietqr.io/img/OCB.png" },
  { bin: "970449", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", logo: "https://api.vietqr.io/img/LPB.png" },
  { bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", logo: "https://api.vietqr.io/img/SEAB.png" },
];
