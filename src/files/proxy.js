const commonConfig = require("common-display-module");

module.exports = {
    getProxyUri() {
        const proxy = commonConfig.getProxyAgents();
        return (proxy.httpsAgent && proxy.httpsAgent.proxyUri) || (proxy.httpAgent && proxy.httpAgent.proxyUri) || null // eslint-disable-line no-extra-parens
    }
}
