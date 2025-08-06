import { render, screen, waitFor } from "@testing-library/react";
import { ProfileAvatarSettings } from "./index";
import { Avatar } from "@/features/users/types";
import userEvent from "@testing-library/user-event";
import { API_URL, MAX_AVATAR_FILE_SIZE } from "@/constants";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { Toaster } from "@/features/ui/toaster";

const VALID_NAME = "Tim Foo";
const CURRENT_AVATAR_URL = "/current-avatar";
const PREVIEW_AVATAR_URL = "/preview-avatar";

const VALID_AVATAR: Readonly<Avatar> = {
  id: 1,
  key: "test-key",
  url: CURRENT_AVATAR_URL,
  isLocal: false,
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("should render component", () => {
  const component = render(
    <ProfileAvatarSettings name={VALID_NAME} avatar={null} />
  );
  expect(component).toBeDefined();
});

global.URL.createObjectURL = jest.fn(() => PREVIEW_AVATAR_URL);
global.URL.revokeObjectURL = jest.fn();

const getNextImageUrl = (url: string) =>
  "/_next/image?url=" + url.replaceAll("/", "%2F") + "&w=256&q=75";

describe("testing avatar display", () => {
  describe("when the user has no avatar", () => {
    it("should display the first letter of the name", () => {
      render(<ProfileAvatarSettings name={VALID_NAME} avatar={null} />);
      expect(screen.getByText(VALID_NAME[0])).toBeInTheDocument();
    });
    it("should hide the delete avatar button", () => {
      render(<ProfileAvatarSettings name={VALID_NAME} avatar={null} />);
      expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    });
  });

  describe("when the user has an avatar", () => {
    it("should display the image if exists", async () => {
      render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
      expect(screen.queryByText(VALID_NAME[0])).toBeNull();
      expect(screen.getByAltText(`${VALID_NAME}'s avatar`)).toHaveAttribute(
        "src",
        getNextImageUrl(CURRENT_AVATAR_URL)
      );
    });

    it("should show the delete avatar button if avatar exists", async () => {
      render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
      expect(
        await screen.findByRole("button", { name: /remove/i })
      ).toBeInTheDocument();
    });
  });

  it("should disable the Upload button if no new avatar is present", () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();
  });
});

describe("testing avatar upload", () => {
  it("should show the preview image, enable the  after uploading successfully", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    const newImage = new File(["hello"], "avatar.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    expect(screen.getByAltText(`${VALID_NAME}'s avatar`)).toHaveAttribute(
      "src",
      getNextImageUrl(PREVIEW_AVATAR_URL)
    );
  });

  it("should hide the Remove button and show Cancel button instead after uploading successfully", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    const newImage = new File(["hello"], "avatar.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("should show the errors if the avatar is not the correct mimetype", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={null} />);
    const newImage = new File(["hello"], "hello.txt", { type: "text/plain" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);

    expect(
      await screen.findByText(/image file can only be either png or jpeg/i)
    ).toBeInTheDocument();
  });

  it("should show the errors if the avatar size is too large", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    const newImage = new File(
      ["a".repeat(MAX_AVATAR_FILE_SIZE + 1)],
      "large-image.jpeg",
      { type: "image/jpeg" }
    );
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    expect(screen.getByAltText(`${VALID_NAME}'s avatar`)).toHaveAttribute(
      "src",
      getNextImageUrl(CURRENT_AVATAR_URL)
    );
    expect(
      await screen.findByText("Image size is too large")
    ).toBeInTheDocument();
  });

  it("should clear the preview image and hide the Cancel button when the Cancel button is clicked", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    const newImage = new File(["hello"], "avatar.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByAltText(`${VALID_NAME}'s avatar`)).toHaveAttribute(
      "src",
      getNextImageUrl(CURRENT_AVATAR_URL)
    );
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });
});

describe("when uploading to the server", () => {
  it("should show the loading state and stop later regardless", async () => {
    render(<ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />);
    const newImage = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    const updateButton = screen.getByRole("button", { name: /upload/i });
    await userEvent.click(updateButton);
    expect(updateButton).toHaveTextContent("Uploading...");
    expect(updateButton).toBeDisabled();
    await waitFor(
      () => {
        expect(updateButton).toHaveTextContent("Upload");
      },
      { timeout: 2000 }
    );
  });

  it("should show success alert when upload is successful", async () => {
    render(
      <>
        <Toaster />
        <ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />
      </>
    );
    const newImage = new File(["hello"], "avatar.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    await userEvent.click(screen.getByRole("button", { name: /upload/i }));
    await waitFor(
      () => {
        expect(
          screen.getByText(/avatar updated successfully/i)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("should show error alert if unexpected error occurs", async () => {
    server.use(
      http.patch(API_URL + "/settings/profile/avatar", () =>
        HttpResponse.json(
          {
            message: "Something went wrong",
          },
          { status: 500 }
        )
      )
    );
    render(
      <>
        <Toaster />
        <ProfileAvatarSettings name={VALID_NAME} avatar={VALID_AVATAR} />
      </>
    );
    const newImage = new File(["hello"], "avatar.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/upload image/i), newImage);
    await userEvent.click(screen.getByRole("button", { name: /upload/i }));
    await waitFor(
      () => {
        expect(
          screen.getByText(/failed to update avatar/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
