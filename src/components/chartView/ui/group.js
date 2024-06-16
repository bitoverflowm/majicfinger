import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

  import { Label } from "@radix-ui/react-context-menu"

  const Group = ({ title, options, val, call }) => {
      return (
          <div className="flex place-items-center gap-2 w-full">
            <Label htmlFor="subTitle" className="text-xs">{title}</Label>
            <Select value={val} onValueChange={call}>
                <SelectTrigger className="w-3/4 text-xs p-2 border rounded">
                    <SelectValue placeholder={`Select ${title}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option, index) => (
                        <SelectItem key={index} value={option}>
                            <span>{option}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
      );
  };
  
  export default Group;
  