module.exports = {
  siteMetadata: {
    siteUrl: "https://www.amazingefren.com",
    title: "amazingefren",
  },
  plugins: [
    "gatsby-plugin-preload-fonts",
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-sass",
    "gatsby-plugin-sharp",
    "gatsby-plugin-image",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: `${__dirname}/images/`,
      },
    },
    {
      resolve: "gatsby-plugin-react-svg",
      options: {
        rule: {
          include: /\.react\.svg$/
        },
      },
    },
  ],
};
