module.exports = {
  siteMetadata: {
    siteUrl: "https://www.amazingefren.com",
    title: "amazingefren",
  },
  plugins: [
    "gatsby-plugin-sass",
    "gatsby-plugin-preload-fonts",
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: `${__dirname}/src/images`,
      },
    },
  ],
};
