import flags from "react-phone-number-input/flags";
import * as RPNInput from "react-phone-number-input";

interface AnnouncementBarProps {
  message: string;
  countryCode?: RPNInput.Country;
  className?: string;
  textClassName?: string;
}

export function AnnouncementBar({
  message,
  countryCode,
  className = "bg-primary",
  textClassName = "text-sm md:text-base font-medium",
}: AnnouncementBarProps) {
  const Flag = countryCode ? flags[countryCode] : null;

  return (
    <div className={`${className} w-full py-3`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-2 text-white">
          <span className={textClassName}>
            {message}
          </span>
          {Flag && countryCode && (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
              <Flag title={countryCode} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

