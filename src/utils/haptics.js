import * as Haptics from "expo-haptics";

export const hapticLight = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
};

export const hapticMedium = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
};

export const hapticSuccess = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
};

export const hapticWarning = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {}
};

export const hapticSelection = () => {
  try { Haptics.selectionAsync(); } catch (e) {}
};
