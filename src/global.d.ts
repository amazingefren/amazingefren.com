declare module "*.ico" {
  export default "" as string;
}

declare module "*.png" {
  export default "" as string;
}

declare module "*.svg" {
  const content: any;
  export default content;
}
