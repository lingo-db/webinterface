import React from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface Props {
    code: string;
    language: string;
}

const CodeBlock: React.FC<Props> = ({ code, language }) => {
    const ref = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        if (ref.current) {
            hljs.highlightBlock(ref.current);
        }
    }, []);

    return (
        <pre>
            <code ref={ref} className={language}>
        {code}
        </code>
        </pre>
);
};

export default CodeBlock;
