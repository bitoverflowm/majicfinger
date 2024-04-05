import { useEffect, useRef } from 'react';
import Typed from 'typed.js';

const TypedText = ({ text }) => {
    const el = useRef(null);

    useEffect(() => {
        // Function to wrap the first word of each string in a span with a style for coloring
        const colorFirstWord = (texts, color) => {
            return texts.map(text => {
                const firstSpaceIndex = text.indexOf(' ');
                if (firstSpaceIndex === -1) { // No spaces found, the whole text is one word
                    return `<span style="color:${color};padding-right:10px;">${text} </span>`;
                }
                return `<span style="color:${color};padding-right:15px;"> ${text.substring(0, firstSpaceIndex)}</span> ${text.substring(firstSpaceIndex + 1)} `;
            });
        };

        const strings = text ? [text] : [
            'Instant Graphs.',
            'Twitter Data No Code',
            'Stunning Charts.',
            'Beautiful Colors.',
            'Instant APIs.',
            'Your Secret Weapon.',
            'Chart Anything',
            'Connect to Twitter',
            'Unprecedented Insights',
            'Analyze Data With AI',
            'Get Home on Time',
        ];

        // Example color: 'red'. You can replace 'red' with any color you like.
        const coloredStrings = colorFirstWord(strings, '#004FFF');

        const typed = new Typed(el.current, {
            strings: coloredStrings,
            typeSpeed: 75,
            backSpeed: 10,
            loop: text ? false : true,
            showCursor: false,
            contentType: 'html', // Tell Typed.js to parse strings as HTML
        });

        return () => {
            typed.destroy();
        };
    }, [text]);

    return (
        text ? <div><span ref={el}></span></div>
            : <div className='text-7xl font-title font-black sm:flex place-items-center place-content-center' ref={el}></div>
    );
};

export default TypedText;
