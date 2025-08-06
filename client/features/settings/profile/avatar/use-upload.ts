import { FileWithPreview } from "@/features/common/types";
import { timeout } from "@/features/common/utils";
import { useToast } from "@/features/ui/use-toast";
import { Avatar } from "@/features/users/types";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { deleteAvatar } from "./delete-avatar";
import { uploadAvatar } from "./upload-avatar";
import { useRouter } from "next/navigation";

export const useUploadImage = (avatar: Avatar | null) => {
  const { toast } = useToast();
  const router = useRouter();
  const [newImage, setNewImage] = useState<FileWithPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const onImageChange = (image?: File) => {
    if (!image) return;
    const preview = URL.createObjectURL(image);
    setNewImage(Object.assign(image, { preview }));
  };

  const clearPreviewImage = () => {
    if (!newImage) return;
    URL.revokeObjectURL(newImage.preview);
    setNewImage(null);
  };

  const uploadImage = async () => {
    if (!newImage) return;
    setLoading(true);
    await timeout();
    try {
      if (avatar) await deleteAvatar();
      await uploadAvatar(newImage);
      toast({
        variant: "success",
        title: "Avatar updated successfully",
      });
      clearPreviewImage();
      router.refresh();
    } catch (error: any) {
      const message = isAxiosError(error)
        ? error.response?.data.message
        : error.message;
      toast({
        variant: "error",
        title: "Failed to update avatar",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!newImage) return;
    return () => URL.revokeObjectURL(newImage.preview);
  }, [newImage]);

  return { loading, uploadImage, onImageChange, newImage, clearPreviewImage };
};
