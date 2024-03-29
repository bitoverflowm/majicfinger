import { CgTouchpad } from "react-icons/cg";

// tourSteps.js
const steps = [
    {
      id: 'intro',
      attachTo: { element: '.twitter-handle-input', on: 'right' },
      title: 'Enter any Twitter handle and hit save.',
      text: `(free plan)<div/><div/>
      You can enter either:
      <div> 🚀 elonmusk</div>
      <div>🎤 justinbieber</div> 
      <div> ⚽ Cristiano <div/> .<div/>
      Even if you enter another name, I will send you back Justin Beiber's data lol`,
      beforeShowPromise: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            window.scrollTo(0, 0);
            resolve();
          }, 500);
        });
      },
      when: {
        show: () => {
          console.log("show step");
        },
        hide: () => {
          console.log("hide step");
        },
      },
      buttons: [
        {
          text: 'Next',
          action: function() { return this.show('2'); },
        },
      ],
      classes: "",
      highlightClass: "highlight",
      modalOverlayOpeningPadding: "10",
      scrollTo: true,
    },
    {
      id: '2',
      attachTo: { element: '.twitter-handle-input', on: 'top' },
      title: 'Make sure you hit save.',
      beforeShowPromise: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            window.scrollTo(0, 0);
            resolve();
          }, 500);
        });
      },
      when: {
        show: () => {
          console.log("show step");
        },
        hide: () => {
          console.log("hide step");
        },
      },
      buttons: [
        {
          text: 'Yes, I saved it!',
          action: function() { return this.show('3'); },
        },
      ],
      classes: "",
      highlightClass: "highlight",
    },
    {
      id: '3',
      attachTo: { element: '.pinned_tweet_tour', on: 'left' },
      title: 'Getting user pinned tweet',
      text: `Toggle "pinned_tweet_id" if you would like to pull user's pinned tweet:
      <div> this is optional</div>
      `,
      beforeShowPromise: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            window.scrollTo(0, 0);
            resolve();
          }, 100);
        });
      },
      when: {
        show: () => {
          console.log("show step");
        },
        hide: () => {
          console.log("hide step");
        },
      },
      buttons: [
        {
          text: 'next',
          action: function() { return this.show('4'); }
        },
      ],
      classes: "",
      highlightClass: "highlight",
    },
    {
      id: '4',
      attachTo: { element: '.pinned_tweet_details_tour', on: 'top' },
      title: 'Pinned Tweet Details',
      text: `Select all the info you would like about the user's pinned tweets
      <div> this is also optional</div>
      `,
      beforeShowPromise: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            window.scrollTo(0, 0);
            resolve();
          }, 100);
        });
      },
      when: {
        show: () => {
          console.log("show step");
        },
        hide: () => {
          console.log("hide step");
        },
      },
      buttons: [
        {
          text: 'next',
          action: function() { return this.show('5'); },
        },
      ],
      classes: "",
      highlightClass: "highlight",
    },
    {
      id: '5',
      attachTo: { element: '.user_details_tour', on: 'right' },
      title: 'Getting user details',
      text: `Now decide on what user data you want to pull. "public_metrics" is a good start.
      <div/> it pulls down details like follower count, following count, etc.
      `,
      beforeShowPromise: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            window.scrollTo(0, 0);
            resolve();
          }, 100);
        });
      },
      when: {
        show: () => {
          console.log("show step");
        },
        hide: () => {
          console.log("hide step");
        },
      },
      buttons: [
        {
          text: 'next',
          action: function() { return this.show('4'); },
        },
      ],
      classes: "",
      highlightClass: "highlight",
    },
    // Add more steps as needed
  ];
  
  export default steps;
  