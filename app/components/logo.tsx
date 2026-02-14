function Logo({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <svg
      width="180"
      height="26"
      viewBox="0 0 180 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M29.7327 26H22.2524L25.1696 12.4439L15.6335 22.3607L10.3975 12.4439L7.48031 26H0L3.9648 7.42888H1.15941L2.76813 0H13.0516L18.2876 9.91679L27.826 0H35.3063L29.7327 26Z"
        fill={variant === "primary" ? "black" : "currentColor"}
      />
      <path
        d="M56.396 26H35.0794L32.125 22.2866L36.0876 3.71553L40.6508 0H61.9695L64.8867 3.71553L60.9219 22.2866L56.396 26ZM54.2262 18.5711L56.6196 7.42888H42.7833L40.3899 18.5711H54.2262Z"
        fill={variant === "primary" ? "black" : "currentColor"}
      />
      <path
        d="M77.8619 26H70.3816L74.3464 7.42888H64.0234L65.6322 0H93.7562L92.1475 7.42888H81.8267L77.8619 26Z"
        fill={variant === "primary" ? "black" : "currentColor"}
      />
      <path
        d="M113.169 26H91.8529L88.8984 22.2866L92.8611 3.71553L97.4242 0H118.743L121.66 3.71553L117.695 22.2866L113.169 26ZM111 18.5711L113.393 7.42888H99.5567L97.1634 18.5711H111Z"
        fill={variant === "primary" ? "black" : "currentColor"}
      />
      <path
        d="M142.636 26H122.255L119.301 22.2866L123.263 3.71553L127.827 0H149.145L147.537 7.42888H129.959L127.566 18.5711H140.468L140.878 16.7144H135.27L136.841 9.28556H149.93L147.162 22.2866L142.636 26Z"
        fill={variant === "primary" ? "#CF172F" : "currentColor"}
      />
      <path
        d="M164.104 26.0001H156.624L160.589 7.429H150.266L151.874 0.00012207H179.998L178.39 7.429H168.069L164.104 26.0001Z"
        fill={variant === "primary" ? "#CF172F" : "currentColor"}
      />
    </svg>
  );
}

export { Logo };
