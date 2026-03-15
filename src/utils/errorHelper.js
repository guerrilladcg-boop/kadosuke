import { Alert } from "react-native";

export function showError(error, fallbackMessage = "エラーが発生しました") {
  let message = fallbackMessage;

  if (typeof error === "string") {
    message = error;
  } else if (error?.message) {
    if (error.code === "23505") {
      message = "このデータは既に登録されています";
    } else if (error.code === "23503") {
      message = "関連するデータが見つかりません";
    } else if (error.code === "42501" || error.code === "PGRST301") {
      message = "この操作を行う権限がありません";
    } else if (error.code === "PGRST116") {
      message = "データが見つかりませんでした";
    } else {
      message = error.message;
    }
  }

  Alert.alert("エラー", message);
}
