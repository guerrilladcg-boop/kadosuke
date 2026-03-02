import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActionSheetIOS, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

export default function ProfileImagePicker({ avatarUrl, initial, size = 80, onImageSelected }) {
  const handlePress = () => {
    const options = ["カメラで撮影", "ライブラリから選択", "キャンセル"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) pickImage("camera");
          else if (index === 1) pickImage("library");
        }
      );
    } else {
      Alert.alert("プロフィール画像", "画像の取得方法を選択", [
        { text: "カメラで撮影", onPress: () => pickImage("camera") },
        { text: "ライブラリから選択", onPress: () => pickImage("library") },
        { text: "キャンセル", style: "cancel" },
      ]);
    }
  };

  const pickImage = async (source) => {
    try {
      const ImagePicker = require("expo-image-picker");
      let result;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("権限エラー", "カメラへのアクセスを許可してください");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("権限エラー", "写真ライブラリへのアクセスを許可してください");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }
      if (!result.canceled && result.assets?.[0]?.uri) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("エラー", "画像の取得に失敗しました");
    }
  };

  return (
    <TouchableOpacity style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]} onPress={handlePress}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initial, { fontSize: size * 0.35 }]}>{initial}</Text>
        </View>
      )}
      <View style={styles.editBadge}>
        <Ionicons name="camera" size={14} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  image: { resizeMode: "cover" },
  placeholder: { backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  initial: { color: "#fff", fontWeight: "bold" },
  editBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: C.dark, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.card },
});
