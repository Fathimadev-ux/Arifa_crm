import * as migration_20261114_040035_initial from './20261114_040035_initial';
import * as migration_20261116_031837_uploads_banners_buttons from './20261116_031837_uploads_banners_buttons';

export const migrations = [
  {
    up: migration_20261114_040035_initial.up,
    down: migration_20261114_040035_initial.down,
    name: '20261114_040035_initial',
  },
  {
    up: migration_20261116_031837_uploads_banners_buttons.up,
    down: migration_20261116_031837_uploads_banners_buttons.down,
    name: '20261116_031837_uploads_banners_buttons'
  },
];
