import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import copy from "copy-to-clipboard";
import { useState } from "react";
import { toast } from "sonner";

export function UrlMaker({ id }: { id: string }) {
  const [width, setWidth] = useState(100);

  const [rotate, setRotate] = useState(0);

  const [url, setUrl] = useState(
    `/image/${id}?width=${width}&rotate=${rotate}`
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Rotate:</span>
          <Slider
            className="relative flex h-5 w-[200px] touch-none select-none items-center"
            value={[rotate]}
            onValueChange={(v) => setRotate(v[0] ?? 0)}
            max={180}
            min={-180}
            step={5}
          ></Slider>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="widthInput" className="mr-2">{`Width:`}</label>
          <input
            id="widthInput"
            type="number"
            value={width}
            max={2000}
            min={100}
            className="input input-border input-sm"
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={() => setUrl(`/image/${id}?width=${width}&rotate=${rotate}`)}
        >
          Make
        </Button>
      </div>
      <div>
        <div className="flex justify-center items-center">
          <img src={url} alt="xxx" className="max-w-full max-h-[60vh]" />
        </div>
      </div>
      <div className="flex justify-between items-center gap-2">
        <Input
          value={`${process.env.NEXT_PUBLIC_SITE_URL}${url}`}
          readOnly
        ></Input>
        <Button
          onClick={() => {
            copy(`${process.env.NEXT_PUBLIC_SITE_URL}${url}`);
            toast("Copy Succeed!");
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}
