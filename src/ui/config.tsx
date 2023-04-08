import Notiflix from "notiflix";
import { applyProxyConfig, checkAndExecuteUnblock, stopUNMProcesses } from "../unblock";
import { LocalJSONConfig } from "../utils/config"
import { RoundedRectButton } from "./RoundRectBtn";
import { VersionSelector } from "./VersionSelector";
import { readUrlFile } from "../utils/network";

export function Config({ config, stylesheet }: { config: LocalJSONConfig, stylesheet: string }) {
    const [configRefresher, setRefresher] = React.useState(0);

    const [installedVersions, setInstalledVersions] = React.useState([]);
    const [onlineVersions, setOnlineVersions] = React.useState([]);

    React.useEffect(() => {
        !(async () => {

            const files = await betterncm.fs.readDir("./RevivedUnblockInstaller/");
            const versions = files.map(v => v.split(/\/|\\/g).pop()).filter((file) => {
                return file.startsWith("UnblockNeteaseMusic-") && file.endsWith(".exe");
            }).map((file) => {
                return file.replace("UnblockNeteaseMusic-", "").replace(".exe", "");
            });
            setInstalledVersions(versions);
            const latestVersion = await fetch("https://api.github.com/repos/UnblockNeteaseMusic/server/releases/latest")
                .then(v => v.json());

            const asset = latestVersion.assets.find(asset => asset.name.includes("win-x64"));

            setOnlineVersions([{
                tag: latestVersion.tag_name,
                installed: versions.includes(latestVersion.tag_name),
                filename: `UnblockNeteaseMusic-${latestVersion.tag_name}.exe`,
                onlineFileName: asset.name,
                releaseDate: asset.created_at,
                download_url: asset.browser_download_url
            }, {
                tag: latestVersion.tag_name + "-ghproxy",
                installed: versions.includes(latestVersion.tag_name + "-ghproxy"),
                filename: `UnblockNeteaseMusic-${latestVersion.tag_name}-ghproxy.exe`,
                onlineFileName: asset.name,
                releaseDate: asset.created_at,
                download_url: "https://ghproxy.com/" + asset.browser_download_url
            }]);
        })()
    }, []);

    React.useEffect(() => {
        const handleChange = () => {
            setRefresher(prev => prev + 1);
        };
        config.addEventListener('change', handleChange);
        return () => config.removeEventListener('change', handleChange);
    }, [config]);

    const switchWindowShow = async () => {
        const visible = config.getConfig("visible", false);
        config.setConfig("visible", !visible);
        await config.write();
        await stopUNMProcesses();
        await checkAndExecuteUnblock(config);
    };

    const onApplyVersion = async () => {
        const selectedVersion = config.getConfig("selectedVersion", null);
        if (!selectedVersion) {
            Notiflix.Notify.info("请先选中一个版本");
            return;
        }
        await stopUNMProcesses();

        await checkAndExecuteUnblock(config);
    }

    const versions = React.useMemo(() => onlineVersions.concat(installedVersions.map(v => ({
        tag: v,
        installed: true,
        filename: `UnblockNeteaseMusic-${v}.exe`,
        releaseDate: "未知"
    }))), [onlineVersions, installedVersions]);
    const selectedVersionIndex = React.useMemo(() => versions.findIndex(v => v.tag === config.getConfig("selectedVersion", null)?.tag), [
        versions, configRefresher
    ]);

    const onPluginStatusChange = async (enabled: boolean) => {
        config.setConfig("enabled", enabled);
        await config.write();
        if (enabled) {
            await checkAndExecuteUnblock(config);
        } else {
            await stopUNMProcesses();
            await applyProxyConfig({ Type: "none" });
        }
    }

    return (
        <div className="unm">
            <div className="title">
                UnblockCloudMusic
                <div className="revived">Revived</div>
            </div>

            <RoundedRectButton defaultValue={config.getConfig("enabled", false)} onChange={onPluginStatusChange}>
                <div className="optionBlock versionSel">
                    <div className="optionTitle">下载配置</div>
                    <div className="optionSubtitle">版本选择</div>
                    <VersionSelector
                        UNMVersions={versions}
                        selectedVersionIndex={selectedVersionIndex}
                        config={config}
                    />
                    <button className="btn" onClick={() => onApplyVersion()}>应用</button>
                </div>

                <div className="optionBlock versionSel">
                    <div className="optionTitle">运行状况</div>
                    <div className="optionSubtitle">当前端口</div>
                    <div style={{ padding: "10px", fontSize: "20px" }}>{config.getConfig("port", Math.round(Math.random() * 10000 + 10000))}</div>
                    <div className="optionSubtitle">操作</div>
                    <button style={{ margin: "10px 5px" }} className="btn" onClick={() => switchWindowShow()}>切换窗口显隐</button>
                    <button style={{ margin: "10px 5px" }} className="btn" onClick={() => checkAndExecuteUnblock(config)}>重新启动进程</button>
                </div>
            </RoundedRectButton>
            <style>
                {stylesheet}
            </style>
        </div>
    );
}

export function NotSupported() {
    return (
        <div>
            <h1>UnblockInstaller 仅支持 x64 系统</h1>
        </div>
    )
}