import axios from "axios";
import { API_URL } from "@/constants";

export const uploadAvatar = async (avatar: File) => {
  const formData = new FormData();
  formData.append("avatar", avatar);
  await axios.patch(API_URL + "/settings/profile/avatar", formData, {
    withCredentials: true,
  });
};
