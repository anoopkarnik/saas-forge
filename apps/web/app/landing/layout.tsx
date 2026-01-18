"use client"

import React from 'react'


const Layout= ({ children }: { children: React.ReactNode }) => {

  return (
    <div className='relative w-full'>
      {children}
    </div>
  );
};

export default Layout;