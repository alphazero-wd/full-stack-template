"use client";
import { ImageDropzone } from "@/features/common/components/dropzone";
import { Button } from "@/features/ui/button";
import { Spinner } from "@/features/ui/spinner";
import { ProfileAvatar } from "@/features/users/avatar";
import { Avatar } from "@/features/users/types";
import { useDropzone } from "react-dropzone";
import { DeleteAvatarDialog } from "./delete-dialog";
import { useUploadImage } from "./use-upload";
import { CircleAlertIcon } from "lucide-react";
import { API_URL, MAX_AVATAR_FILE_SIZE } from "@/constants";

interface ProfileAvatarSettingsProps {
  name: string;
  avatar: Avatar | null;
}

export const ProfileAvatarSettings = ({
  avatar,
  name,
}: ProfileAvatarSettingsProps) => {
  const { loading, newImage, onImageChange, uploadImage, clearPreviewImage } =
    useUploadImage(avatar);

  const { isDragActive, getInputProps, getRootProps, fileRejections } =
    useDropzone({
      validator: (file) => {
        if (!["image/jpeg", "image/png"].includes(file.type))
          return {
            message: "Image file can only be either PNG or JPEG",
            code: "NotAllowedMimetype",
          };
        if (file.size > MAX_AVATAR_FILE_SIZE)
          return {
            message: "Image size is too large",
            code: "TooLargeFileSize",
          };
        return null;
      },
      multiple: false,
      onDrop: (files) => {
        onImageChange(files[0]);
      },
    });

  const errors = Array.from(
    new Set(
      fileRejections.flatMap(({ errors }) =>
        errors.map(({ message }) => message)
      )
    )
  );

  return (
    <section className="grid gap-y-4">
      <div
        {...getRootProps({
          className: "relative w-24 h-24 group rounded-full",
        })}
      >
        <ImageDropzone
          isDragActive={isDragActive}
          getInputProps={getInputProps}
          id="avatar-upload"
        />
        <ProfileAvatar
          isPreview={!!newImage}
          name={name}
          avatar={
            newImage?.preview ||
            (!avatar?.isLocal ? avatar?.url : `${API_URL}/files/${avatar?.id}`)
          }
          size="lg"
        />
      </div>
      <div className="grid gap-y-2">
        {errors.length === 0 ? (
          <p className="text-[0.8rem] text-muted-foreground">
            Only accept PNG and JPEG files. Up to 2MB is allowed
          </p>
        ) : (
          errors.map((error) => (
            <p
              key={error}
              className="text-[0.8rem] flex gap-x-2 items-center font-medium text-destructive"
            >
              <CircleAlertIcon className="w-4 h-4" />
              {error}
            </p>
          ))
        )}
      </div>
      <div className="pt-2 border-t flex items-center gap-x-4">
        {newImage ? (
          <Button onClick={clearPreviewImage} variant="outline">
            Cancel
          </Button>
        ) : (
          avatar && <DeleteAvatarDialog />
        )}
        <Button
          onClick={uploadImage}
          disabled={loading || !newImage}
          className="w-fit gap-x-2"
        >
          {loading && <Spinner />} {loading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </section>
  );
};
