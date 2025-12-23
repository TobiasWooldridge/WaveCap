import "./Skeleton.scss";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular";
  className?: string;
  count?: number;
}

export const Skeleton = ({
  width,
  height,
  variant = "text",
  className = "",
  count = 1,
}: SkeletonProps) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  const items = Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={`skeleton skeleton--${variant} ${className}`}
      style={style}
      aria-hidden="true"
    />
  ));

  return count === 1 ? items[0] : <>{items}</>;
};

export const TranscriptSkeleton = () => (
  <div className="transcript-skeleton">
    <div className="transcript-skeleton__item">
      <div className="transcript-skeleton__avatar">
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="transcript-skeleton__content">
        <div className="transcript-skeleton__header">
          <Skeleton width="80px" height="14px" />
          <Skeleton width="60px" height="12px" />
        </div>
        <div className="transcript-skeleton__body">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="75%" height="16px" />
        </div>
      </div>
    </div>
    <div className="transcript-skeleton__item">
      <div className="transcript-skeleton__avatar">
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="transcript-skeleton__content">
        <div className="transcript-skeleton__header">
          <Skeleton width="100px" height="14px" />
          <Skeleton width="50px" height="12px" />
        </div>
        <div className="transcript-skeleton__body">
          <Skeleton width="90%" height="16px" />
        </div>
      </div>
    </div>
    <div className="transcript-skeleton__item">
      <div className="transcript-skeleton__avatar">
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="transcript-skeleton__content">
        <div className="transcript-skeleton__header">
          <Skeleton width="70px" height="14px" />
          <Skeleton width="55px" height="12px" />
        </div>
        <div className="transcript-skeleton__body">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="40%" height="16px" />
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
