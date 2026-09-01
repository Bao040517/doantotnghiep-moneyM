import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Svg, { Path, Rect, Circle, G, Line, Polygon } from "react-native-svg";

export type CategoryKey =
  | "Ăn uống"
  | "Chi tiêu hàng ngày"
  | "Quần áo"
  | "Phí giao lưu"
  | "Mỹ phẩm"
  | "Tiền nhà"
  | "Tiền điện"
  | "Tiền nước"
  | "Đi lại"
  | "Phí liên lạc"
  | "Y tế"
  | "Giáo dục"
  | "Mục tiêu tiết kiệm"
  | "Trả nợ nhóm"
  | "Nhận tiền nhóm"
  | "Mua sắm"
  | "Giải trí"
  | "Lưu trú"
  | "Di chuyển"
  | "Tiền lương"
  | "Thưởng"
  | "Đầu tư"
  | "Thu nhập phụ"
  | "Hoàn tiền"
  | "Khác"
  | string;

interface CategoryIconProps {
  name?: CategoryKey;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Chuẩn hóa tên danh mục hoặc mã icon về key cơ bản
export function normalizeCategoryName(rawName?: string): string {
  if (!rawName) return "Khác";
  const s = rawName.trim().toLowerCase();

  if (s.includes("ăn") || s.includes("uống") || s.includes("food") || s.includes("dining") || s.includes("cafe") || s.includes("nhà hàng") || s.includes("utensil")) {
    return "Ăn uống";
  }
  if (s.includes("hàng ngày") || s.includes("sinh hoạt") || s.includes("siêu thị") || s.includes("tạp hóa") || s.includes("grocer") || s.includes("shopping-bag")) {
    return "Chi tiêu hàng ngày";
  }
  if (s.includes("áo") || s.includes("quần") || s.includes("thời trang") || s.includes("cloth") || s.includes("shirt")) {
    return "Quần áo";
  }
  if (s.includes("giao lưu") || s.includes("bạn bè") || s.includes("tiệc") || s.includes("party") || s.includes("nhậu") || s.includes("users")) {
    return "Phí giao lưu";
  }
  if (s.includes("mỹ phẩm") || s.includes("làm đẹp") || s.includes("beauty") || s.includes("cosmetic") || s.includes("spa") || s.includes("son") || s.includes("sparkle")) {
    return "Mỹ phẩm";
  }
  if (s.includes("nhà") || s.includes("phòng") || s.includes("rent") || s.includes("house") || s.includes("home") || s.includes("trọ") || s.includes("building")) {
    return "Tiền nhà";
  }
  if (s.includes("nước") || s.includes("water") || s.includes("droplet") || s.includes("cấp nước") || s.includes("sawaco") || s.includes("biwase")) {
    return "Tiền nước";
  }
  if (s.includes("điện") || s.includes("tiện ích") || s.includes("utility") || s.includes("electric") || s.includes("evn") || s.includes("zap")) {
    return "Tiền điện";
  }
  if (s.includes("đi lại") || s.includes("di chuyển") || s.includes("xăng") || s.includes("xe") || s.includes("taxi") || s.includes("grab") || s.includes("transport") || s.includes("vé") || s.includes("car") || s.includes("bus")) {
    return "Đi lại";
  }
  if (s.includes("liên lạc") || s.includes("điện thoại") || s.includes("4g") || s.includes("wifi") || s.includes("internet") || s.includes("phone")) {
    return "Phí liên lạc";
  }
  if (s.includes("y tế") || s.includes("thuốc") || s.includes("khám") || s.includes("bệnh") || s.includes("health") || s.includes("medical") || s.includes("pill") || s.includes("heart-pulse") || s.includes("heart")) {
    return "Y tế";
  }
  if (s.includes("giáo dục") || s.includes("học") || s.includes("sách") || s.includes("edu") || s.includes("book") || s.includes("khóa") || s.includes("graduation")) {
    return "Giáo dục";
  }
  if (s.includes("tiết kiệm") || s.includes("quỹ") || s.includes("saving") || s.includes("mục tiêu") || s.includes("target") || s.includes("piggy")) {
    return "Mục tiêu tiết kiệm";
  }
  if (s.includes("trả nợ") || s.includes("nợ") || s.includes("debt") || s.includes("settle") || s.includes("chuyển")) {
    return "Trả nợ nhóm";
  }
  if (s.includes("mua sắm") || s.includes("shopping") || s.includes("shop")) {
    return "Mua sắm";
  }
  if (s.includes("giải trí") || s.includes("game") || s.includes("phim") || s.includes("cinema") || s.includes("hát") || s.includes("karaoke")) {
    return "Giải trí";
  }
  if (s.includes("lưu trú") || s.includes("khách sạn") || s.includes("hotel") || s.includes("resort") || s.includes("homestay")) {
    return "Lưu trú";
  }
  if (s.includes("lương") || s.includes("salary") || s.includes("wallet")) {
    return "Tiền lương";
  }
  if (s.includes("thưởng") || s.includes("bonus") || s.includes("gift")) {
    return "Thưởng";
  }
  if (s.includes("đầu tư") || s.includes("invest") || s.includes("trending-up")) {
    return "Đầu tư";
  }
  if (s.includes("phụ") || s.includes("coin")) {
    return "Thu nhập phụ";
  }
  if (s.includes("hoàn tiền") || s.includes("refund")) {
    return "Hoàn tiền";
  }

  return "Khác";
}

const STROKE_WIDTH = 2;

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 28, color = "#10B981", style }) => {
  const categoryKey = normalizeCategoryName(name);

  const renderIcon = () => {
    switch (categoryKey) {
      case "Ăn uống":
        return (
          /* 2D Line: Ramen Bowl with Chopsticks */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M6 14C6 20.6 10.5 25 16 25C21.5 25 26 20.6 26 14H6Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path
              d="M11 25H21V27C21 27.5 20.5 28 20 28H12C11.5 28 11 27.5 11 27V25Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
            />
            <Path d="M7 6L23 13" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Path d="M9 4L26 11" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Path d="M12 9C12 7.5 13 6 13 5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M18 9C18 7.5 19 6 19 5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );

      case "Chi tiêu hàng ngày":
        return (
          /* 2D Line: Shopping Grocery Basket */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M10 14C10 10.7 12.7 8 16 8C19.3 8 22 10.7 22 14"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
            <Path
              d="M5 14H27L24.5 25C24.3 25.9 23.5 26.5 22.5 26.5H9.5C8.5 26.5 7.7 25.9 7.5 25L5 14Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d="M11 18V22.5M16 18V22.5M21 18V22.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        );

      case "Quần áo":
        return (
          /* 2D Line: T-Shirt */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M10 5L4 10L7 14L10 12V26C10 26.5 10.5 27 11 27H21C21.5 27 22 26.5 22 26V12L25 14L28 10L22 5C20 7.5 12 7.5 10 5Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d="M12 5.5C13 8 19 8 20 5.5" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Rect x="16" y="14" width="4.5" height="4.5" rx="1" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Phí giao lưu":
        return (
          /* 2D Line: Cheers Glasses */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M5 8L11 17V24H8M11 24H14M11 17H6L5 8H15L14 17"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M27 8L21 17V24H24M21 24H18M21 17H26L27 8H17L18 17"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path d="M16 3V6M14 4.5L18 4.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );

      case "Mỹ phẩm":
        return (
          /* 2D Line: Lipstick & Powder Compact */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Circle cx="21" cy="20" r="6.5" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Circle cx="21" cy="20" r="3.5" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
            <Path d="M8 8L12 5V13H8V8Z" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
            <Rect x="7" y="13" width="6" height="5" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="6" y="18" width="8" height="9" rx="1.5" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Tiền nhà":
        return (
          /* 2D Line: House */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="20" y="6" width="3" height="6" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="7" y="14" width="18" height="13" rx="1" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path
              d="M4 14L16 4L28 14H4Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path
              d="M13 27V19C13 18.5 13.5 18 14 18H18C18.5 18 19 18.5 19 19V27H13Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
            />
            <Circle cx="16" cy="10" r="2" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Tiền điện":
        return (
          /* 2D Line: Lightbulb */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path d="M16 2V4.5M6 13H3.5M28.5 13H26M8 6L9.8 7.8M24 6L22.2 7.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
            <Path
              d="M10 13C10 9.7 12.7 7 16 7C19.3 7 22 9.7 22 13C22 15.5 20.5 17.5 19 19.5V22H13V19.5C11.5 17.5 10 15.5 10 13Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d="M14 13L16 11L18 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M13 22H19V25H13V22Z" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path d="M14 25H18L16 27.5L14 25Z" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Tiền nước":
        return (
          /* 2D Line: Water Droplet */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M16 4C16 4 9 14.5 9 20C9 23.9 12.1 27 16 27C19.9 27 23 23.9 23 20C23 14.5 16 4 16 4Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path
              d="M13 18C13 15.5 14.5 12 15.5 10"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Circle cx="22" cy="11" r="2" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Đi lại":
      case "Di chuyển":
        return (
          /* 2D Line: Car */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M8 15L11 9H21L24 15H8Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path
              d="M4 15H27C27.5 15 28 15.5 28 16V21C28 21.5 27.5 22 27 22H25C25 20.3 23.7 19 22 19C20.3 19 19 20.3 19 22H13C13 20.3 11.7 19 10 19C8.3 19 7 20.3 7 22H4C3.5 22 3 21.5 3 21V16C3 15.5 3.5 15 4 15Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
            />
            <Circle cx="10" cy="22" r="3" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Circle cx="22" cy="22" r="3" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Phí liên lạc":
        return (
          /* 2D Line: Smartphone */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path d="M22 6C24.5 8 25 11 25 11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
            <Rect x="8" y="5" width="13" height="23" rx="3" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="10" y="8" width="9" height="15" rx="1" stroke={color} strokeWidth={1.2} />
            <Circle cx="14.5" cy="25.5" r="1" fill={color} />
          </Svg>
        );

      case "Y tế":
        return (
          /* 2D Line: Medical Capsule & Cross */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <G transform="rotate(-45 13 19)">
              <Rect x="8" y="13" width="10" height="14" rx="5" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
              <Line x1="8" y1="20" x2="18" y2="20" stroke={color} strokeWidth={STROKE_WIDTH} />
            </G>
            <Path d="M24 16V24M20 20H28" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        );

      case "Giáo dục":
        return (
          /* 2D Line: Book & Pencil */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M6 8C6 6.9 6.9 6 8 6H23C24.1 6 25 6.9 25 8V24C25 25.1 24.1 26 23 26H8C6.9 26 6 25.1 6 24V8Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
            />
            <Path d="M9 6V26" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path d="M18 6V13L20.5 11L23 13V6H18Z" fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Mục tiêu tiết kiệm":
        return (
          /* 2D Line: Piggy Bank */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Circle cx="16" cy="7" r="3" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path
              d="M8 17C8 12.6 11.6 9 16 9C20.4 9 24 12.6 24 17C24 18.5 23.5 20 22.5 21L23 25H19L18 23H14L13 25H9L9.5 21C8.5 20 8 18.5 8 17Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Rect x="4.5" y="15" width="4" height="3.5" rx="1.5" stroke={color} strokeWidth={1.5} />
            <Circle cx="11" cy="14" r="1.2" fill={color} />
          </Svg>
        );

      case "Trả nợ nhóm":
      case "Nhận tiền nhóm":
        return (
          /* 2D Line: Cash & Exchange Arrows */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="7" y="10" width="18" height="12" rx="2" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Circle cx="16" cy="16" r="3" stroke={color} strokeWidth={1.5} />
            <Path d="M10 6H23L20 3M23 6L20 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M22 26H9L12 23M9 26L12 29" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );

      case "Mua sắm":
        return (
          /* 2D Line: Shopping Bag */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M12 11V8C12 5.8 13.8 4 16 4C18.2 4 20 5.8 20 8V11"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
            <Path
              d="M7 11H25L23.5 26C23.4 26.6 22.8 27 22.2 27H9.8C9.2 27 8.6 26.6 8.5 26L7 11Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Circle cx="16" cy="18" r="3" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Giải trí":
        return (
          /* 2D Line: Game Controller */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M6 12C6 9.8 7.8 8 10 8H22C24.2 8 26 9.8 26 12V20C26 22.5 23.5 25 21 24L17 22H15L11 24C8.5 25 6 22.5 6 20V12Z"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d="M10 13V17M8 15H12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx="21" cy="13.5" r="1.5" stroke={color} strokeWidth={1.2} />
            <Circle cx="23.5" cy="16" r="1.5" stroke={color} strokeWidth={1.2} />
          </Svg>
        );

      case "Lưu trú":
        return (
          /* 2D Line: Hotel Bed */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path d="M5 10V25M5 13H27V25M27 10V25" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Rect x="5" y="17" width="22" height="6" rx="1" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="8" y="12" width="6" height="4" rx="1.5" stroke={color} strokeWidth={1.5} />
            <Rect x="16" y="12" width="6" height="4" rx="1.5" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Tiền lương":
        return (
          /* 2D Line: Wallet with Cash */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="4" y="9" width="24" height="17" rx="3" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path d="M4 14H28" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path d="M21 17H28V22H21C19.9 22 19 21.1 19 20V19C19 17.9 19.9 17 21 17Z" fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
            <Circle cx="24.5" cy="19.5" r="1" fill={color} />
          </Svg>
        );

      case "Thưởng":
        return (
          /* 2D Line: Gift Box */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="5" y="13" width="22" height="14" rx="2" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="4" y="9" width="24" height="5" rx="1.5" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Line x1="16" y1="9" x2="16" y2="27" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Path d="M12 9C12 6.5 13.5 5 16 5C16 7 14 9 12 9Z" stroke={color} strokeWidth={1.5} />
            <Path d="M20 9C20 6.5 18.5 5 16 5C16 7 18 9 20 9Z" stroke={color} strokeWidth={1.5} />
          </Svg>
        );

      case "Đầu tư":
        return (
          /* 2D Line: Growth Chart */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path d="M5 26H27" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Path d="M5 6V26" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Path d="M8 20L14 14L19 18L26 9M26 9H21M26 9V14" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );

      case "Thu nhập phụ":
        return (
          /* 2D Line: Coins Stack */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Circle cx="13" cy="14" r="7" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Circle cx="13" cy="14" r="4" stroke={color} strokeWidth={1.5} />
            <Circle cx="20" cy="19" r="6" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Hoàn tiền":
        return (
          /* 2D Line: Refund Circle Arrow */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path d="M8 8V14H14" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M9 13C10.5 8.5 14.8 5.5 20 6.5C25.5 7.5 28.5 13 26.5 18C24.5 23.5 19 26.5 13.5 24.5C11 23.5 9 21.5 8 19" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
          </Svg>
        );

      case "Khác":
      default:
        return (
          /* 2D Line: Parcel Box */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="6" y="10" width="20" height="16" rx="2" fill="#FFFFFF" stroke={color} strokeWidth={STROKE_WIDTH} />
            <Rect x="14" y="10" width="4" height="16" stroke={color} strokeWidth={1.5} />
            <Path d="M6 14H26" stroke={color} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );
    }
  };

  return <View style={[styles.container, style]}>{renderIcon()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

