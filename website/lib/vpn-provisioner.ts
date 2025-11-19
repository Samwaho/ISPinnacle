import { RouterOsApi, type RouterOsRawCommand } from "@/lib/routeros-api";
import type { OrganizationDevice } from "@/lib/generated/prisma";

const vpnHost = process.env.ROUTEROS_VPN_HOST;
const vpnPort = Number.parseInt(process.env.ROUTEROS_VPN_PORT ?? "8728", 10);
const vpnUsername = process.env.ROUTEROS_VPN_USERNAME;
const vpnPassword = process.env.ROUTEROS_VPN_PASSWORD;
const vpnInterface = process.env.ROUTEROS_VPN_INTERFACE;

const isVpnConfigured = () =>
  Boolean(vpnHost && vpnUsername && vpnPassword && vpnInterface);

export const registerDeviceOnCentralVpn = async (device: Pick<
  OrganizationDevice,
  "id" | "name" | "vpnIpAddress" | "wireguardPublicKey" | "wireguardPresharedKey"
>) => {
  if (!isVpnConfigured()) {
    console.warn(
      "[vpn-provisioner] RouterOS VPN configuration missing. Skipping central VPN automation for",
      device.id
    );
    return;
  }

  if (!device.wireguardPublicKey) {
    throw new Error(
      `[vpn-provisioner] Cannot register device ${device.id} without a WireGuard public key`
    );
  }

  console.info("[vpn-provisioner] Registering device on VPN", {
    deviceId: device.id,
    vpnIp: device.vpnIpAddress,
    interface: vpnInterface,
  });

  const commands: RouterOsRawCommand[] = [];

  const addArgs = [
    `=interface=${vpnInterface}`,
    `=comment=${device.id}`,
    `=name=${device.name}`,
    `=public-key=${device.wireguardPublicKey}`,
    ...(device.wireguardPresharedKey ? [`=preshared-key=${device.wireguardPresharedKey}`] : []),
    `=allowed-address=${device.vpnIpAddress}/32`,
  ];

  commands.push({
    command: "/interface/wireguard/peers/add",
    args: addArgs,
  });

  console.info("[vpn-provisioner] Executing provisioning commands", {
    deviceId: device.id,
    host: vpnHost,
    port: vpnPort,
    commands,
  });

  await RouterOsApi.queryDevice({
    deviceId: device.id,
    address: vpnHost!,
    username: vpnUsername!,
    password: vpnPassword!,
    port: Number.isFinite(vpnPort) ? vpnPort : 8728,
    queries: [],
    rawCommands: commands,
  });

  console.info("[vpn-provisioner] Device registered on VPN", {
    deviceId: device.id,
    vpnIp: device.vpnIpAddress,
  });
};
