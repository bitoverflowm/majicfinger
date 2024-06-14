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
      <select onChange={(e) => setFont(e.target.value)} className="text-xs"  style={{fontFamily: font}}>
        {options.map((option, index) => (
          <option key={index} value={option.fontFamily} style={{fontFamily: option.fontFamily}}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };
  
  export default FontSelector;