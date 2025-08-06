import { BasicInfoForm } from "./form";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/constants";
import { Toaster } from "@/features/ui/toaster";
import { server } from "@/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VALID_NAME = "Tim Foo";

it("should prefill the input", () => {
  render(<BasicInfoForm name={VALID_NAME} />);
  expect(screen.getByLabelText(/your name/i)).toHaveValue(VALID_NAME);
});

it("should reset the change when the Reset button is clicked", async () => {
  render(
    <>
      <Toaster />
      <BasicInfoForm name={VALID_NAME} />
    </>
  );
  await userEvent.type(screen.getByLabelText(/your name/i), "John Doe");
  await userEvent.click(screen.getByRole("button", { name: /reset/i }));
  expect(screen.getByLabelText(/your name/i)).toHaveValue(VALID_NAME);
  await waitFor(
    async () => {
      expect(await screen.findByText(/changes cancelled/i)).toBeInTheDocument();
    },
    { timeout: 2000 }
  );
});

describe("when provided name is invalid", () => {
  it("should show errors if name is required", async () => {
    render(<BasicInfoForm name={VALID_NAME} />);
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.clear(screen.getByLabelText(/your name/i));
    await userEvent.click(updateNameButton);
    const nameErrorMessage = await screen.findByText(/name is required/i);
    expect(nameErrorMessage).toBeInTheDocument();
  });
  it("should show an error if name is too long", async () => {
    render(<BasicInfoForm name={VALID_NAME} />);
    const nameInput = screen.getByLabelText(/your name/i);
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.type(nameInput, "a".repeat(31));
    await userEvent.click(updateNameButton);
    const nameErrorMessage = await screen.findByText(/name is too long/i);
    expect(nameErrorMessage).toBeInTheDocument();
  });
  it("should show an error if name hasn't changed", async () => {
    render(<BasicInfoForm name={VALID_NAME} />);
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.click(updateNameButton);
    const nameErrorMessage = await screen.findByText(
      /no changes made to your name/i
    );
    expect(nameErrorMessage).toBeInTheDocument();
  });
});

describe("validation is successful", () => {
  it("should display loading state after submitting the form and later stop regardless", async () => {
    render(<BasicInfoForm name={VALID_NAME} />);
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.type(screen.getByLabelText(/your name/i), "bob");
    await userEvent.click(updateNameButton);
    expect(updateNameButton).toHaveTextContent("Updating...");
    expect(screen.getByLabelText(/your name/i)).toBeDisabled();
    expect(updateNameButton).toBeDisabled();
    await waitFor(
      () => {
        expect(updateNameButton).toHaveTextContent("Update");
        expect(screen.getByLabelText(/your name/i)).not.toBeDisabled();
        expect(updateNameButton).not.toBeDisabled();
      },
      { timeout: 2000 }
    );
  });

  it("should display error alert if some unexpected error occur", async () => {
    server.use(
      http.patch(API_URL + "/settings/profile/name", () => {
        return HttpResponse.json(
          { message: "Something went wrong" },
          { status: 500 }
        );
      })
    );
    render(
      <>
        <Toaster />
        <BasicInfoForm name={VALID_NAME} />
      </>
    );
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.type(screen.getByLabelText(/your name/i), "bob");
    await userEvent.click(updateNameButton);
    await waitFor(
      async () => {
        expect(
          await screen.findByText(/failed to update name/i)
        ).toBeInTheDocument();
        expect(
          await screen.findByText(/something went wrong/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should display alert and reset form when name is updated successfully", async () => {
    const components = (
      <>
        <Toaster />
        <BasicInfoForm name={VALID_NAME} />
      </>
    );
    render(components);
    const nameInput = screen.getByLabelText(/your name/i);
    const updateNameButton = screen.getByRole("button", { name: /update/i });
    await userEvent.type(nameInput, "bob");
    await userEvent.click(updateNameButton);
    await waitFor(
      async () => {
        expect(
          await screen.findByText(/updated your name successfully/i)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
