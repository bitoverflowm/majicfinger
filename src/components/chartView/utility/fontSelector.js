import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options = [
  { fontFamily: 'times, Times New Roman, times-roman, georgia, serif', label: 'Times New Roman' },
  { fontFamily: 'Roboto, sans-serif', label: 'Roboto' },
  { fontFamily: 'Open Sans, sans-serif', label: 'Open Sans' },
  { fontFamily: 'SpaceGrotesk-Light', label: 'SpaceGrotesk-Light' },
  { fontFamily: 'SpaceGrotesk-Medium', label: 'SpaceGrotesk-Medium' },
  { fontFamily: 'oswald', label: 'oswald' },
  { fontFamily: 'Inter', label: 'Inter' },
  { fontFamily: 'Montserrat', label: 'Montserrat'}
  // Add more options as needed
];

const FontSelector = ({ font, setFont }) => {
  return (
      <Select value={font} onValueChange={(value) => setFont(value)}>
        <SelectTrigger className="w-3/4 text-xs p-2 border rounded" style={{ fontFamily: font }}>
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
