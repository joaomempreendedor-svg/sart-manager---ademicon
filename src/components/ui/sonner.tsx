"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useApp } from "@/context/AppContext";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useApp();

  return (
    <SonnerToaster
      theme={theme === "dark" ? "dark" : "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-800 dark:group-[.toaster]:text-gray-50 dark:group-[.toaster]:border-slate-700",
          description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-brand-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 dark:group-[.toast]:bg-slate-700 dark:group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };