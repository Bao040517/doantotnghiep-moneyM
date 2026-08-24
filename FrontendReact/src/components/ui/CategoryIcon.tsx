import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Svg, { Path, Rect, Circle, G, Ellipse, Line, Polygon } from "react-native-svg";

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
  | "Khác"
  | string;

interface CategoryIconProps {
  name?: CategoryKey;
  size?: number;
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

  return "Khác";
}

const OUTLINE = "#0F172A";
const STROKE_WIDTH = 2;

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 28, style }) => {
  const categoryKey = normalizeCategoryName(name);

  const renderIcon = () => {
    switch (categoryKey) {
      case "Ăn uống":
        return (
          /* Ramen / Food Bowl with Chopsticks & Egg */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Noodles / Food inside */}
            <Path d="M8 15C8 15 10 11 16 11C22 11 24 15 24 15H8Z" fill="#FBBF24" />
            <Circle cx="16" cy="13" r="2.5" fill="#FFFFFF" />
            <Circle cx="16" cy="13" r="1.2" fill="#F97316" />
            {/* Bowl Body */}
            <Path
              d="M6 14C6 20.6274 10.4772 25 16 25C21.5228 25 26 20.6274 26 14H6Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Bowl Base */}
            <Path
              d="M11 25H21V27C21 27.5523 20.5523 28 20 28H12C11.4477 28 11 27.5523 11 27V25Z"
              fill="#0284C7"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
            />
            {/* Chopsticks */}
            <Path d="M7 6L23 13" stroke="#F43F5E" strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            <Path d="M9 4L26 11" stroke="#F43F5E" strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            {/* Steam bubbles */}
            <Path d="M12 8C12 7 13 6 13 5" stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M18 8C18 7 19 6 19 5" stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );

      case "Chi tiêu hàng ngày":
        return (
          /* Shopping Grocery Basket with Apple & Bread */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Items inside basket */}
            <Rect x="13" y="7" width="6" height="10" rx="2" fill="#F43F5E" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Circle cx="9" cy="14" r="3.5" fill="#10B981" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Circle cx="22" cy="13" r="3" fill="#FBBF24" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Basket handle */}
            <Path
              d="M10 14C10 10.6863 12.6863 8 16 8C19.3137 8 22 10.6863 22 14"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
            {/* Basket Body */}
            <Path
              d="M5 14H27L24.5 25C24.3 25.9 23.5 26.5 22.5 26.5H9.5C8.5 26.5 7.7 25.9 7.5 25L5 14Z"
              fill="#FB923C"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <Path d="M11 18V22M16 18V22M21 18V22" stroke="#EA580C" strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        );

      case "Quần áo":
        return (
          /* T-Shirt with collar and star badge */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M10 5L4 10L7 14L10 12V26C10 26.5523 10.4477 27 11 27H21C21.5523 27 22 26.5523 22 26V12L25 14L28 10L22 5C20 7.5 12 7.5 10 5Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Collar */}
            <Path d="M12 5.5C13 8 19 8 20 5.5" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            {/* Pocket / Badge */}
            <Rect x="17" y="13" width="4" height="4.5" rx="1" fill="#F43F5E" stroke={OUTLINE} strokeWidth={1.2} />
          </Svg>
        );

      case "Phí giao lưu":
        return (
          /* Cocktail / Party drink glasses cheering */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Left Glass */}
            <Path d="M7 10L12 18V25H9M12 25H15M12 18H7L6 10H16L15 18" fill="#FDA4AF" />
            <Path
              d="M5 8L11 17V24H8M11 24H14M11 17H6"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Glass */}
            <Path d="M25 8L19 17V24H22M19 24H16M19 17H24" fill="#FDE047" />
            <Path
              d="M25 8L19 17V24H22M19 24H16M19 17H24"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cheer Sparks */}
            <Path d="M15 4L15 7M13 5L17 5" stroke="#F43F5E" strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx="15" cy="11" r="1.5" fill="#38BDF8" />
          </Svg>
        );

      case "Mỹ phẩm":
        return (
          /* Lipstick and Powder Compact */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Powder Compact */}
            <Circle cx="21" cy="20" r="7" fill="#FED7AA" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Circle cx="21" cy="20" r="4" fill="#F472B6" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Lipstick Bullet */}
            <Path d="M8 8L12 5V13H8V8Z" fill="#F43F5E" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
            {/* Lipstick Base Tube */}
            <Rect x="7" y="13" width="6" height="5" fill="#FDE047" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Rect x="6" y="18" width="8" height="9" rx="1.5" fill="#818CF8" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Tiền nhà":
        return (
          /* Cozy House with Chimney and Window */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Chimney */}
            <Rect x="20" y="6" width="3" height="6" fill="#F43F5E" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* House Body */}
            <Rect x="7" y="14" width="18" height="13" rx="1" fill="#FEF08A" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Roof */}
            <Path
              d="M4 14L16 4L28 14H4Z"
              fill="#F43F5E"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Door */}
            <Path
              d="M13 27V19C13 18.4477 13.4477 18 14 18H18C18.5523 18 19 18.4477 19 19V27H13Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
            />
            {/* Window */}
            <Circle cx="16" cy="10" r="2" fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.5} />
          </Svg>
        );

      case "Tiền điện":
        return (
          /* Lightbulb with Energy Glow */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Rays */}
            <Path d="M16 3V5M6 13H4M28 13H26M8 6L10 8M24 6L22 8" stroke="#F59E0B" strokeWidth={1.8} strokeLinecap="round" />
            {/* Bulb Glass */}
            <Path
              d="M10 13C10 9.68629 12.6863 7 16 7C19.3137 7 22 9.68629 22 13C22 15.5 20.5 17.5 19 19.5V22H13V19.5C11.5 17.5 10 15.5 10 13Z"
              fill="#FDE047"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Filament */}
            <Path d="M14 13L16 11L18 13" stroke="#F97316" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            {/* Metal Base */}
            <Path d="M13 22H19V25H13V22Z" fill="#94A3B8" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Path d="M14 25H18L16 27.5L14 25Z" fill="#64748B" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
          </Svg>
        );

      case "Tiền nước":
        return (
          /* Sparkling Water Droplet & Ripple */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Water Droplet Body */}
            <Path
              d="M16 4C16 4 9 14.5 9 20C9 23.866 12.134 27 16 27C19.866 27 23 23.866 23 20C23 14.5 16 4 16 4Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Inner Reflection Arc */}
            <Path
              d="M13 18C13 15.5 14.5 12 15.5 10"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Water Wave Base Accent */}
            <Path
              d="M12 21C13.5 22.5 18.5 22.5 20 21"
              stroke="#0284C7"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            {/* Mini Splash Bubble */}
            <Circle cx="22.5" cy="11.5" r="2.2" fill="#7DD3FC" stroke={OUTLINE} strokeWidth={1.2} />
          </Svg>
        );

      case "Đi lại":
      case "Di chuyển":
        return (
          /* Compact Travel Car with Headlight & Wheels */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Car Top */}
            <Path
              d="M8 15L11 9H21L24 15H8Z"
              fill="#C7D2FE"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Car Body */}
            <Path
              d="M4 15H27C27.5523 15 28 15.4477 28 16V21C28 21.5523 27.5523 22 27 22H25C25 20.3431 23.6569 19 22 19C20.3431 19 19 20.3431 19 22H13C13 20.3431 11.6569 19 10 19C8.34315 19 7 20.3431 7 22H4C3.44772 22 3 21.5523 3 21V16C3 15.4477 3.44772 15 4 15Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
            />
            {/* Headlights */}
            <Circle cx="26" cy="18" r="1.5" fill="#FDE047" />
            {/* Wheels */}
            <Circle cx="10" cy="22" r="3" fill="#0F172A" stroke="#FFFFFF" strokeWidth={1.5} />
            <Circle cx="22" cy="22" r="3" fill="#0F172A" stroke="#FFFFFF" strokeWidth={1.5} />
          </Svg>
        );

      case "Phí liên lạc":
        return (
          /* Smartphone with Wifi / Signal wave */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Wifi Wave */}
            <Path d="M22 6C24.5 8 25 11 25 11" stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
            <Path d="M20 9C21.5 10.2 22 12 22 12" stroke="#38BDF8" strokeWidth={2} strokeLinecap="round" />
            {/* Phone Body */}
            <Rect x="8" y="5" width="13" height="23" rx="3" fill="#818CF8" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Screen */}
            <Rect x="10" y="8" width="9" height="15" rx="1" fill="#FFFFFF" />
            {/* Chat message inside */}
            <Rect x="11" y="11" width="7" height="3.5" rx="1" fill="#38BDF8" />
            <Rect x="11" y="16" width="5" height="3" rx="1" fill="#F43F5E" />
            {/* Home button */}
            <Circle cx="14.5" cy="25.5" r="1" fill="#FFFFFF" />
          </Svg>
        );

      case "Y tế":
        return (
          /* Medical Capsule & First Aid Cross */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Background Circle Pill */}
            <Circle cx="21" cy="12" r="6" fill="#FDE047" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Line x1="16.5" y1="12" x2="25.5" y2="12" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Capsule */}
            <G transform="rotate(-45 13 19)">
              <Rect x="8" y="13" width="10" height="14" rx="5" fill="#38BDF8" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
              <Path d="M8 20H18V22C18 24.7614 15.7614 27 13 27C10.2386 27 8 24.7614 8 22V20Z" fill="#F43F5E" />
            </G>
            {/* Red Cross */}
            <Path d="M22 20V26M19 23H25" stroke="#F43F5E" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        );

      case "Giáo dục":
        return (
          /* Book with Bookmark & Pencil */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Book Base */}
            <Path
              d="M6 8C6 6.89543 6.89543 6 8 6H23C24.1046 6 25 6.89543 25 8V24C25 25.1046 24.1046 26 23 26H8C6.89543 26 6 25.1046 6 24V8Z"
              fill="#38BDF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
            />
            {/* Pages edge */}
            <Path d="M9 6V26" stroke="#0284C7" strokeWidth={STROKE_WIDTH} />
            {/* Bookmark */}
            <Path d="M18 6V13L20.5 11L23 13V6H18Z" fill="#F43F5E" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Pencil */}
            <G transform="rotate(45 15 17)">
              <Rect x="12" y="10" width="3" height="12" fill="#FBBF24" stroke={OUTLINE} strokeWidth={1.2} />
              <Polygon points="12,10 15,10 13.5,6" fill="#F43F5E" stroke={OUTLINE} strokeWidth={1.2} />
            </G>
          </Svg>
        );

      case "Mục tiêu tiết kiệm":
        return (
          /* Cute Pink Piggy Bank with Gold Coin */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Gold Coin */}
            <Circle cx="16" cy="7" r="3.5" fill="#FBBF24" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Path d="M16 5.5V8.5" stroke="#D97706" strokeWidth={1.5} strokeLinecap="round" />
            {/* Piggy Body */}
            <Path
              d="M8 17C8 12.5817 11.5817 9 16 9C20.4183 9 24 12.5817 24 17C24 18.5 23.5 20 22.5 21L23 25H19L18 23H14L13 25H9L9.5 21C8.5 20 8 18.5 8 17Z"
              fill="#F472B6"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Snout */}
            <Rect x="4" y="15" width="4.5" height="4" rx="1.5" fill="#FDA4AF" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Ear */}
            <Path d="M21 9L23 5L24 9" fill="#FB7185" stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
            {/* Eye */}
            <Circle cx="11" cy="14" r="1.2" fill="#0F172A" />
          </Svg>
        );

      case "Trả nợ nhóm":
      case "Nhận tiền nhóm":
        return (
          /* Two Synchronized Transfer Arrows with Money Note */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Cash Note */}
            <Rect x="7" y="10" width="18" height="12" rx="2" fill="#34D399" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            <Circle cx="16" cy="16" r="3" fill="#A7F3D0" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Top Arrow (Right) */}
            <Path d="M10 6H23L20 3M23 6L20 9" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {/* Bottom Arrow (Left) */}
            <Path d="M22 26H9L12 23M9 26L12 29" stroke="#F43F5E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );

      case "Mua sắm":
        return (
          /* Shopping Tote Bag with Gift Tag */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Bag Handle */}
            <Path
              d="M12 11V8C12 5.79086 13.7909 4 16 4C18.2091 4 20 5.79086 20 8V11"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
            {/* Bag Body */}
            <Path
              d="M7 11H25L23.5 26C23.4 26.6 22.8 27 22.2 27H9.8C9.2 27 8.6 26.6 8.5 26L7 11Z"
              fill="#FB7185"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* Star badge on bag */}
            <Circle cx="16" cy="18" r="3.5" fill="#FDE047" stroke={OUTLINE} strokeWidth={1.5} />
          </Svg>
        );

      case "Giải trí":
        return (
          /* Retro Game Controller */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Controller Body */}
            <Path
              d="M6 12C6 9.79086 7.79086 8 10 8H22C24.2091 8 26 9.79086 26 12V20C26 22.5 23.5 25 21 24L17 22H15L11 24C8.5 25 6 22.5 6 20V12Z"
              fill="#818CF8"
              stroke={OUTLINE}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
            />
            {/* D-Pad Left */}
            <Path d="M10 13V17M8 15H12" stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" />
            {/* Buttons Right */}
            <Circle cx="21" cy="13.5" r="1.5" fill="#F43F5E" stroke={OUTLINE} strokeWidth={1} />
            <Circle cx="23.5" cy="16" r="1.5" fill="#FDE047" stroke={OUTLINE} strokeWidth={1} />
          </Svg>
        );

      case "Lưu trú":
        return (
          /* Hotel Bed with Pillow */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Headboard */}
            <Path d="M5 10V25M5 13H27V25M27 10V25" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
            {/* Blanket */}
            <Rect x="5" y="17" width="22" height="6" rx="1" fill="#38BDF8" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Pillows */}
            <Rect x="8" y="12" width="6" height="4" rx="1.5" fill="#FED7AA" stroke={OUTLINE} strokeWidth={1.5} />
            <Rect x="16" y="12" width="6" height="4" rx="1.5" fill="#FED7AA" stroke={OUTLINE} strokeWidth={1.5} />
          </Svg>
        );

      case "Khác":
      default:
        return (
          /* Parcel Box with Tape & Ribbon */
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            {/* Box Body */}
            <Rect x="6" y="10" width="20" height="16" rx="2" fill="#FBBF24" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Tape / Stripe */}
            <Rect x="14" y="10" width="4" height="16" fill="#F43F5E" stroke={OUTLINE} strokeWidth={1.5} />
            {/* Top Flap fold */}
            <Path d="M6 14H26" stroke={OUTLINE} strokeWidth={STROKE_WIDTH} />
            {/* Stamp */}
            <Rect x="8" y="17" width="4" height="3" fill="#38BDF8" />
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
