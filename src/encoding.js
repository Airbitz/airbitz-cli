// @flow

import baseX from 'base-x'
import utf8Codec from 'utf8'

const base58Codec = baseX(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
)

export const base58 = {
  parse(text) {
    return base58Codec.decode(text)
  },
  stringify(data) {
    return base58Codec.encode(data)
  }
}

export const utf8 = {
  parse(text) {
    const byteString = utf8Codec.encode(text)
    const out = new Uint8Array(byteString.length)

    for (let i = 0; i < byteString.length; ++i) {
      out[i] = byteString.charCodeAt(i)
    }

    return out
  },

  stringify(data) {
    // Some of our data contains terminating null bytes due to an old bug.
    // We need to filter that out here:
    const length = data[data.length - 1] === 0 ? data.length - 1 : data.length

    let byteString = ''
    for (let i = 0; i < length; ++i) {
      byteString += String.fromCharCode(data[i])
    }

    return utf8Codec.decode(byteString)
  }
}
