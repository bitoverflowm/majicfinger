import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { CheckIcon } from '@radix-ui/react-icons';
  
  const Group = ({ title, options, val, call }) => {
      return (
          <div className="flex place-items-center">
              <div className="text-xs w-1/4">
                  {title}
              </div>
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
  