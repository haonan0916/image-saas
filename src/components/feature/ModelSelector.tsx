"use client";

import { useEffect } from "react";
import { trpcClientReact } from "@/utils/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onValueChange, disabled }: ModelSelectorProps) {
  // 获取可用模型列表
  const { data: availableModelsData, isLoading } = trpcClientReact.chat.getAvailableModels.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // 初始化默认模型
  useEffect(() => {
    if (availableModelsData?.currentModel && !value) {
      onValueChange(availableModelsData.currentModel);
    }
  }, [availableModelsData, value, onValueChange]);

  if (!availableModelsData) {
    return null;
  }

  return (
    <div className="w-48">
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {availableModelsData.models.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              {model.name || model.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
