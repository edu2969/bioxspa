import React, { useState, useRef } from "react";
import RadioOption from "./radio-option";

interface IProps {
  options: React.ReactElement<any>[];
  onChange?: (selectedIndex: number) => void;
  value?: number;
  labelText?: string;
}
const RadioGroup = React.forwardRef((props:IProps, ref)  => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const rgRef = useRef<{reset: () => void } | null>(null);
  
  React.useImperativeHandle(ref, () => ({
    reset: () => {
      setSelectedIndex(0);
      props.onChange && props.onChange(0);
    }
  }))

  function onSelect(index: number) {
    setSelectedIndex(index);
    props.onChange && props.onChange(index);
  }
  return (
    <div>
      <div className="flex justify-evenly">
        {props.options.map((el, index) => (
          <RadioOption
            key={index + 1}
            index={index + 1}
            selectedIndex={selectedIndex}
            onSelect={(index:any) => onSelect(index)}
          >
            {el}
          </RadioOption>
        ))}
      </div>
    </div>
  );
});
RadioGroup.displayName = "RadioGroup";
export default RadioGroup;