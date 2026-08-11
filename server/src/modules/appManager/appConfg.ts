// 开放应用（appToken 体系）凭证配置。
// 生产环境必须通过环境变量 XIAOJU_SURVEY_APP_LIST 配置，
// 格式：appId1:appSecret1,appId2:appSecret2
// 非生产环境未配置时回退到内置开发凭证，仅限本地开发与单元测试使用。
const DEV_APP_LIST = [{ appId: '2bAppid', appSecret: '2b123456' }];

function loadAppList(): Array<{ appId: string; appSecret: string }> {
  const raw = process.env.XIAOJU_SURVEY_APP_LIST;
  if (raw) {
    return raw
      .split(',')
      .map((pair) => {
        const [appId, appSecret] = pair.split(':');
        return { appId: appId?.trim(), appSecret: appSecret?.trim() };
      })
      .filter((item): item is { appId: string; appSecret: string } =>
        Boolean(item.appId && item.appSecret),
      );
  }
  if (process.env.NODE_ENV === 'production') {
    return [];
  }
  return DEV_APP_LIST;
}

export const APPList = loadAppList();
