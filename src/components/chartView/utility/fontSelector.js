import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options = [
  { fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif', label: 'Geist Sans' },
  { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', label: 'Geist Mono' },
];

const FontSelector = ({ font, titleFont, setFont }) => {
  const value = font ?? titleFont;
  return (
      <Select value={value} onValueChange={(next) => setFont(next)}>
        <SelectTrigger className="w-3/4 text-xs p-2 border rounded" style={{ fontFamily: value }}>
          <SelectValue placeholder="Select Font" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={index} value={option.fontFamily}>
              <span style={{ fontFamily: option.fontFamily }}>{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
};

export default FontSelector;
