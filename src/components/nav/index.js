//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';


const Nav = () => {
    return (
      <div className="flex w-full">
        <div className="max-w-48 p-6">
          <img src={"./logo.png"}/>
        </div>
        <div className="flex place-items-center w-full place-content-end pr-10 gap-6 text-xs font-bold">
          <div>What is Lychee</div>
          <div>Upload Data</div>
          <div>Create Charts/Graphs</div>
          <div>Analyze Data</div>
          <div>Log In</div>
          <div>Sign Up</div>
        </div>  
      </div>      
    )
  }


export default Nav;
