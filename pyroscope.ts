import Pyroscope from '@pyroscope/nodejs'

const pyroscopeEnabled = process.env.PYROSCOPE_URL

export function startPyroscope() {
  if (pyroscopeEnabled) {
    console.log('Pyroscope enabled')
    console.log('Pyroscope URL: ', process.env.PYROSCOPE_URL)
    Pyroscope.init({
      serverAddress: process.env.PYROSCOPE_URL,
      appName: 'cloud-portal',
      // Enable CPU time collection for wall profiles
      // This is required for CPU profiling functionality
      // wall: {
      //   collectCpuTime: true
      // }
    })

    Pyroscope.start()
  } else {
    console.log('Pyroscope disabled')
  }
}
