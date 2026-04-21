// Peer dependencies loaded dynamically at runtime
declare module '@opentool/proto' {
  const grpc: any
  export { grpc }
  export default grpc
}
