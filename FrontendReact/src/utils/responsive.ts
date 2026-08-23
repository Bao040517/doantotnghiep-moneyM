import { Dimensions, PixelRatio, useWindowDimensions } from "react-native";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

// Kích thước chuẩn bản thiết kế tiêu chuẩn (iPhone 14/15: 390 x 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Co giãn theo chiều ngang (Width, marginHorizontal, paddingHorizontal, iconSize)
 * @param size Kích thước gốc thiết kế
 */
export const scale = (size: number): number => {
  return (WINDOW_WIDTH / BASE_WIDTH) * size;
};

/**
 * Co giãn theo chiều dọc (Height, marginVertical, paddingVertical)
 * @param size Kích thước gốc thiết kế
 */
export const verticalScale = (size: number): number => {
  return (WINDOW_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Co giãn vừa phải (Khuyên dùng cho Font chữ, bo góc borderRadius, padding nhỏ)
 * @param size Kích thước gốc thiết kế
 * @param factor Hệ số điều chỉnh độ co giãn (mặc định 0.5 để tăng/giảm nhẹ nhàng)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Co giãn cỡ chữ (Font size) chống tràn chữ trên màn hình nhỏ
 * @param size Kích thước font gốc
 */
export const scaleFont = (size: number): number => {
  return Math.round(moderateScale(size, 0.4));
};

// Viết tắt tiện dụng (Shorthands)
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const sf = scaleFont;

// Các cờ nhận diện thiết bị
export const SCREEN_WIDTH = WINDOW_WIDTH;
export const SCREEN_HEIGHT = WINDOW_HEIGHT;
export const isSmallDevice = WINDOW_WIDTH < 375;
export const isTablet = WINDOW_WIDTH >= 768;

/**
 * Hook phản hồi kích thước động khi xoay màn hình hoặc đổi split screen
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const dynamicScale = (size: number) => (width / BASE_WIDTH) * size;
  const dynamicVerticalScale = (size: number) => (height / BASE_HEIGHT) * size;
  const dynamicModerateScale = (size: number, factor: number = 0.5) =>
    size + (dynamicScale(size) - size) * factor;
  const dynamicScaleFont = (size: number) =>
    Math.round(dynamicModerateScale(size, 0.4));

  return {
    width,
    height,
    scale: dynamicScale,
    verticalScale: dynamicVerticalScale,
    moderateScale: dynamicModerateScale,
    scaleFont: dynamicScaleFont,
    s: dynamicScale,
    vs: dynamicVerticalScale,
    ms: dynamicModerateScale,
    sf: dynamicScaleFont,
    isSmallDevice: width < 375,
    isTablet: width >= 768,
  };
};
