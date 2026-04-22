import { ExperimentConfig } from '../types';
import { useEffect, useState, useMemo, useContext } from 'react';
import isDemo from '../utils/isDemo';
import { ExperimentsContext } from '../contexts/contexts';

export interface ExperimentsHubInterface {
  configs: ExperimentConfig[];
  userId: string;
}

export function useExperiments(): ExperimentsHubInterface {
  const [experimentConfigs] = useState<ExperimentConfig[]>([]);
  return { configs: experimentConfigs, userId: '' };
}

export interface ExperimentInterface {
  config: ExperimentConfig;
  userId: string;
  treated: boolean;
}

export function useExperiment(id: string): ExperimentInterface {
  const exp = useContext(ExperimentsContext);
  const [config, setConfig] = useState<ExperimentConfig>(
    {} as ExperimentConfig
  );
  useEffect(() => {
    const filtered = exp.configs.filter((e) => e.id == id);
    if (filtered.length) setConfig(filtered[0]);
  }, [exp.configs]);
  const treated = useMemo(() => {
    return false;
  }, [config, exp.userId]);

  return { config, userId: exp.userId, treated };
}
