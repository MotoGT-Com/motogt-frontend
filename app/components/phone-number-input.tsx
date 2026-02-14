import React, { useId, useState } from "react";
import { ChevronDownIcon, PhoneIcon } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function PhoneNumberInput() {
  const id = useId();
  const [value, setValue] = useState("");

  return (
    <div className="*:not-first:mt-2" dir="ltr">
      <Label htmlFor={id}>Phone Number</Label>
      <RPNInput.default
        className="flex rounded-md shadow-xs"
        international={false}
        countrySelectComponent={CountrySelect}
        inputComponent={PhoneInput}
        id={id}
        placeholder="Enter phone number"
        value={value}
        onChange={(newValue) => setValue(newValue ?? "")}
        defaultCountry="JO"
        countryCallingCodeEditable={false}
      />
    </div>
  );
}

export const PhoneInput = ({
  className,
  ...props
}: React.ComponentProps<"input">) => {
  return (
    <Input
      data-slot="phone-input"
      className={cn(
        "-ms-px rounded-s-none shadow-none focus-visible:z-10",
        className
      )}
      {...props}
    />
  );
};

PhoneInput.displayName = "PhoneInput";

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country }[];
};

export const CountrySelect = ({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) => {
  const handleSelect = (value: string) => {
    onChange(value as RPNInput.Country);
  };
  const Flag = flags[value];

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={handleSelect}
      aria-label="Select country"
    >
      <SelectTrigger>
        <SelectValue placeholder={<PhoneIcon size={16} aria-hidden="true" />}>
          {Flag && <Flag title={value} />}
          {value && `+${RPNInput.getCountryCallingCode(value)}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {options
          .filter((x) => x.value)
          .map((option, i) => {
            const Flag = flags[option.value];
            return (
              <SelectItem
                key={option.value ?? `empty-${i}`}
                value={option.value}
              >
                {Flag && <Flag title={option.value} />}
                {option.label}{" "}
                {option.value &&
                  `+${RPNInput.getCountryCallingCode(option.value)}`}
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
};
