import Notice from "./Notice";

const roleByTone = {
  danger: "alert",
  warning: "status",
  info: "status",
  neutral: "status",
  success: "status"
};

export default function StateMessage({ children, className = "", tone = "neutral" }) {
  return (
    <Notice className={className} role={roleByTone[tone]} tone={tone}>
      {children}
    </Notice>
  );
}
