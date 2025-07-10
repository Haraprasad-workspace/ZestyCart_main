const hamburger = document.getElementById("hamburger")
        const navlinks = document.getElementById("navlinks")
        hamburger.addEventListener("click", () => {
            navlinks.classList.toggle("active");
            hamburger.classList.toggle("active");
        })

        document.querySelectorAll('.nav-links').forEach(link => {
            link.addEventListener("click", () => {
                navlinks.classList.remove("active");
            })
        })

        navlinks.addEventListener("mouseleave", () => {
            navlinks.classList.remove("active")
        })