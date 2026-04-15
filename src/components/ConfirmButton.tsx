"use client";

export function ConfirmButton({
  children,
  confirmText = "Are you sure?",
  className = "btn-danger",
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
