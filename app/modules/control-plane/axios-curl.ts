import { AxiosRequestConfig } from 'axios';

export class AxiosCurlLibrary {
  private request: AxiosRequestConfig;

  constructor(config: AxiosRequestConfig) {
    this.request = config;
  }

  getHeaders() {
    let headers = this.request.headers || {},
      curlHeaders = '';

    // get the headers concerning the appropriate method (defined in the global axios instance)
    if (headers && 'common' in headers) {
      const method = this.request.method?.toLowerCase();
      if (method && headers[method]) {
        headers = headers[method];
      }
    }

    // add any custom headers (defined upon calling methods like .get(), .post(), etc.)
    if (this.request.headers) {
      for (const property in this.request.headers) {
        if (!['common', 'delete', 'get', 'head', 'patch', 'post', 'put'].includes(property)) {
          headers[property] = this.request.headers[property];
        }
      }
    }

    for (const property in headers) {
      if ({}.hasOwnProperty.call(headers, property)) {
        const header = `${property}:${headers[property]}`;
        curlHeaders = `${curlHeaders} -H "${header}"`;
      }
    }

    return curlHeaders.trim();
  }

  getMethod() {
    const method = this.request.method?.toUpperCase() || 'GET';
    return `-X ${method}`;
  }

  getBody() {
    if (
      typeof this.request.data !== 'undefined' &&
      this.request.data !== '' &&
      this.request.data !== null &&
      this.request.method?.toUpperCase() !== 'GET'
    ) {
      const data =
        typeof this.request.data === 'object' ||
        Object.prototype.toString.call(this.request.data) === '[object Array]'
          ? JSON.stringify(this.request.data)
          : this.request.data;
      return `--data '${data}'`.trim();
    } else {
      return '';
    }
  }

  getUrl() {
    if (this.request.baseURL) {
      return this.request.baseURL + '/' + (this.request.url || '');
    }
    return this.request.url || '';
  }

  getQueryString() {
    let params = '',
      i = 0;

    if (this.request.params) {
      for (const param in this.request.params) {
        if ({}.hasOwnProperty.call(this.request.params, param)) {
          params +=
            i !== 0
              ? `&${param}=${this.request.params[param]}`
              : `?${param}=${this.request.params[param]}`;
          i++;
        }
      }
    }

    return params;
  }

  getBuiltURL() {
    let url = this.getUrl();

    if (this.getQueryString() !== '') {
      url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
      url += this.getQueryString();
    }

    return url.trim();
  }

  generateCommand() {
    return `curl ${this.getMethod()} ${this.getHeaders()} ${this.getBody()} "${this.getBuiltURL()}"`
      .trim()
      .replace(/\s{2,}/g, ' ');
  }
}
