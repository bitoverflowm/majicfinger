import React from 'react';
import Link from 'next/link';

const Affiliates = () => {
    return (
        <div>
            <h1 className="text-4xl">Become my co-founder without any of the headaches</h1>
            <Link href="https://lych3e.promotekit.com/" className="bg-lychee-go px-3 py-2 cursor-pointer hover:bg-black hover:text-white">All you gotta do is click here, sign up and start referring people to Lychee!</Link>
        </div>
    );
}

export default Affiliates;