// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ErrorBoundary } from "@/components/error-boundary";

function Boom(): never {
  throw new Error("render exploded");
}

describe("ErrorBoundary", () => {
  it("replaces a throwing subtree with the recovery screen", () => {
    // The crash screen is the whole feature: a single render error used
    // to blank the app. Silence the expected console.error so the test
    // output stays readable.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </I18nextProvider>,
    );
    expect(screen.getByText(i18n.t("errors.title"))).toBeInTheDocument();
    expect(screen.getByText("render exploded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: i18n.t("errors.reload") })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <p>healthy content</p>
        </ErrorBoundary>
      </I18nextProvider>,
    );
    expect(screen.getByText("healthy content")).toBeInTheDocument();
    expect(screen.queryByText(i18n.t("errors.title"))).not.toBeInTheDocument();
  });
});
