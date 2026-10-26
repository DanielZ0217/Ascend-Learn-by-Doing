import React from 'react';
import {Composition} from 'remotion';
import {AscendFilm} from './AscendFilm';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AscendFilm"
    component={AscendFilm}
    durationInFrames={5400}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{bgm: true}}
  />
);
